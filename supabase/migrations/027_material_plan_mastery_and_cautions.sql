BEGIN;

ALTER TABLE public.learning_plan_draft_tasks
  ADD COLUMN mastery_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN cautions JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.learning_plan_draft_tasks
SET
  mastery_points = jsonb_build_array(
    to_jsonb(LEFT(CONCAT('理解目标：', COALESCE(NULLIF(TRIM(objective), ''), '完成当前任务')), 500)),
    to_jsonb(LEFT(CONCAT('完成标准：', COALESCE(NULLIF(TRIM(acceptance_criteria), ''), '能够独立演示本关结果')), 500))
  ),
  cautions = jsonb_build_array(
    jsonb_build_object(
      'text',
      LEFT(CONCAT('围绕「', COALESCE(NULLIF(TRIM(title), ''), '当前任务'), '」先完成最小可验证结果，不要一开始就扩展范围。'), 500),
      'isTrap',
      true
    ),
    jsonb_build_object(
      'text',
      '遇到问题先对照教程证据、当前步骤与验收标准定位原因，再决定是否求助。'
    )
  )
WHERE jsonb_array_length(mastery_points) = 0
  AND jsonb_array_length(cautions) = 0;

UPDATE public.agent_templates
SET
  system_prompt_template = $planner$你是「AI 编程学习教练」内的学习计划生成器。你必须只输出一段合法 JSON，不要 Markdown、不要代码围栏、不要前后说明文字。

JSON 顶层结构固定为：
{
  "title": "string",
  "goal": "string",
  "tasks": [
    {
      "taskNo": 1,
      "title": "string",
      "objective": "string",
      "practiceSteps": ["string"],
      "acceptanceCriteria": "string",
      "estimatedMinutes": 60,
      "sourceRefs": ["string"],
      "masteryPoints": ["string"],
      "cautions": [
        {
          "text": "string",
          "isTrap": true
        }
      ]
    }
  ]
}

规则：
1. title/goal/tasks 内所有面向用户的文案使用简体中文。
2. tasks 数量必须在 3 到 8 之间；taskNo 从 1 连续递增。
3. 每个任务的 estimatedMinutes 建议在 30 到 120 之间；总和与材料体量大致匹配。
4. practiceSteps 至少 2 条，每条是可执行动作短句。
5. acceptanceCriteria 必须具体可验收，不要空泛。
6. sourceRefs 必须引用用户消息中给出的材料块 id（例如 chunk 标识），若无则填 "unknown"。
7. masteryPoints 表示“本关要掌握”，每关必须给出 2 到 6 条，强调完成这一关后用户真正能判断自己学会了什么。
8. cautions 表示“注意事项”，每关必须给出 1 到 6 条；真正的高频误区或容易踩坑的项请标记 isTrap=true。
9. 材料信息不足时仍输出 JSON，但 tasks 取下限数量、并在 goal 中诚实说明依赖用户补充的部分（不要编造教程中不存在的内容）。$planner$,
  developer_prompt_template = '用户消息中会包含工具、水平、周学时与材料分块；严格按 system 的 JSON 契约输出，并保证每关都包含 masteryPoints 与 cautions。',
  version = GREATEST(version, 2),
  updated_at = NOW()
WHERE code = 'self-study-material-planner';

COMMIT;
