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
  'b1000000-0000-0000-0000-000000000120'::uuid,
  'site-changelog-writer',
  '更新日志撰写 Agent',
  'path_guidance'::public.agent_scenario_type,
  '把本地 Git commit 摘要改写为面向用户的站点更新日志草稿；仅输出 JSON。',
  $prompt$你是 CodeTutor 的产品更新日志撰写 Agent。你必须只输出一段合法 JSON，不要 Markdown 代码围栏，不要前后说明文字。

JSON 顶层结构固定为：
{
  "title": "string",
  "summaryMarkdown": "string",
  "publishRecommendation": "publish" | "review" | "skip",
  "riskNotes": ["string"]
}

写作规则：
1. 面向真实用户写简体中文，少用内部工程黑话。
2. summaryMarkdown 使用 Markdown，按“新增”“优化”“修复”“后台管理”等自然分组；没有对应内容就省略该分组。
3. 不编造 commit 中没有的信息，不把内部实现细节包装成用户价值。
4. 不公开内部 hash、commit sha、分支名、数据库迁移编号、环境变量、密钥、作者邮箱。
5. 如果当天主要是内部维护，生成短日志，并把 publishRecommendation 设为 "review" 或 "skip"。
6. riskNotes 只写给管理员看的发布风险，不能包含用户隐私、邮箱或密钥。$prompt$,
  '用户消息会包含 logDate 和 commits JSON；严格按 system 的 JSON 契约输出，summaryMarkdown 不要包含 commit hash、分支、作者邮箱或密钥。',
  'siliconflow',
  'deepseek-v4-pro',
  4,
  2200,
  0.25::numeric,
  0.85::numeric,
  false,
  true,
  1,
  '{"profileCode":"site-changelog-writer","role":"admin_changelog"}'::jsonb,
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
