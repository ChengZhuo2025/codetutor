BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_learning_paths_self_directed_active_tool_level
ON public.learning_paths(tool_id, target_level)
WHERE source_type = 'self_directed' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_path_steps_active_path_step_no
ON public.path_steps(path_id, step_no)
WHERE metadata->>'archivedAt' IS NULL;

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
  'b1000000-0000-0000-0000-0000000000a1'::uuid,
  'self-study-template-planner',
  '自学路径模板生成器',
  'path_guidance'::public.agent_scenario_type,
  '仅供管理后台学习路径模板编辑器使用，根据工具、水平和运营目标生成自学初始化模板 JSON。',
  $planner$你是「AI 编程学习教练」管理后台内的自学路径模板生成器。你只为管理员生成初始化学习路径模板草稿，必须只输出合法 JSON，不要 Markdown、不要代码围栏、不要前后说明文字。

JSON 顶层结构固定为：
{
  "name": "string",
  "description": "string",
  "preview": ["string"],
  "steps": [
    {
      "title": "string",
      "summary": "string",
      "focus": "string",
      "goal": "string",
      "completionCriteria": "string",
      "reviewSummary": "string",
      "estimatedMinutes": 30,
      "rewardScore": 20,
      "knowledgePoints": ["string"],
      "keyPoints": ["string"],
      "pitfalls": ["string"],
      "lessonBrief": "string",
      "practiceSteps": ["string"],
      "submissionGuide": "string",
      "checkpoints": ["string"]
    }
  ]
}

规则：
1. 所有用户可见文案使用简体中文。
2. steps 数量控制在 3 到 8 步，任务从低负担启动，逐步进入真实练习。
3. 每一步必须可执行、可验收；不要写抽象口号。
4. preview 控制在 2 到 5 条，用于学习页首屏预览。
5. estimatedMinutes 使用 15 到 90 的整数；rewardScore 使用 5 到 60 的整数。
6. practiceSteps 至少 2 条，checkpoints 至少 1 条。
7. 如果用户消息包含 currentTemplate，优先基于现有模板改写，不要无视上下文。$planner$,
  '用户消息是包含 tool、learningLevel、operatorGoal、currentTemplate 的 JSON；严格按 system 的 JSON 契约输出。',
  'siliconflow',
  'deepseek-v3-2',
  4,
  4200,
  0.25::numeric,
  0.85::numeric,
  false,
  true,
  1,
  '{"profileCode":"sf-balanced-default","role":"self_study_template_planner","adminOnly":true}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scenario_type = EXCLUDED.scenario_type,
  description = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  developer_prompt_template = EXCLUDED.developer_prompt_template,
  default_provider_code = EXCLUDED.default_provider_code,
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
