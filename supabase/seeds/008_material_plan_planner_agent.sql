BEGIN;

INSERT INTO public.agent_templates (
  id,
  code,
  name,
  scenario_type,
  description,
  system_prompt_template,
  developer_prompt_template,
  default_provider_code,
  default_model_code,
  context_message_limit,
  max_output_tokens,
  temperature,
  top_p,
  stream_enabled,
  is_active,
  version,
  metadata,
  created_at,
  updated_at
)
VALUES (
  'b1000000-0000-0000-0000-000000000099'::uuid,
  'self-study-material-planner',
  '自学材料学习计划生成器',
  'path_guidance'::public.agent_scenario_type,
  '根据用户提供的教程材料链接摘要，生成可物化为 path_steps 的多阶段练习计划；仅输出 JSON。',
  $planner$你是「AI 编程学习教练」内的学习计划生成器。你必须只输出一段合法 JSON，不要 Markdown、不要代码围栏、不要前后说明文字。

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
      "sourceRefs": ["string"]
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
7. 材料信息不足时仍输出 JSON，但 tasks 取下限数量、并在 goal 中诚实说明依赖用户补充的部分（不要编造教程中不存在的内容）。$planner$,
  '用户消息中会包含工具、水平、周学时与材料分块；严格按 system 的 JSON 契约输出。',
  'siliconflow',
  'deepseek-v3-2',
  4,
  3200,
  0.25::numeric,
  0.85::numeric,
  false,
  true,
  1,
  '{"profileCode":"sf-balanced-default","role":"material_plan_planner"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scenario_type = EXCLUDED.scenario_type,
  description = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  developer_prompt_template = EXCLUDED.developer_prompt_template,
  default_model_code = EXCLUDED.default_model_code,
  context_message_limit = EXCLUDED.context_message_limit,
  max_output_tokens = EXCLUDED.max_output_tokens,
  temperature = EXCLUDED.temperature,
  top_p = EXCLUDED.top_p,
  stream_enabled = EXCLUDED.stream_enabled,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMIT;
