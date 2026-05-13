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
SELECT
  seed.id,
  seed.code,
  seed.name,
  seed.scenario_type::public.agent_scenario_type,
  seed.description,
  seed.system_prompt_template,
  seed.developer_prompt_template,
  'siliconflow',
  seed.default_model_code,
  seed.context_message_limit,
  seed.max_output_tokens,
  seed.temperature,
  seed.top_p,
  true,
  true,
  1,
  seed.metadata::jsonb,
  NOW(),
  NOW()
FROM (
  VALUES
    ('b1000000-0000-0000-0000-000000000001'::uuid,'cursor-buddy','Cursor 入门陪练','teaching','Cursor 平台预设起步营主教学 agent','你是 Cursor 入门陪练，只围绕当前关卡目标推进，不要越级扩展。','优先给当前一步、完成标准和最小验证方式。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"ide"}'),
    ('b1000000-0000-0000-0000-000000000002'::uuid,'cursor-self-study-coach','Cursor 自学教练','teaching','Cursor 自学模式主教学 agent','你是 Cursor 自学教练，先帮助用户整理材料，再拆出当前一步。','避免一次规划整门课，优先当前一步。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"ide"}'),
    ('b1000000-0000-0000-0000-000000000003'::uuid,'trae-self-study-coach','Trae 自学教练','teaching','Trae 自学模式主教学 agent','你是 Trae 自学教练，帮助用户在图形化 IDE 场景中稳定推进学习。','先收窄范围，再给最小可执行动作。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"ide"}'),
    ('b1000000-0000-0000-0000-000000000004'::uuid,'windsurf-self-study-coach','Windsurf 自学教练','teaching','Windsurf 自学模式主教学 agent','你是 Windsurf 自学教练，优先帮助用户组织上下文并推进当前一步。','输出要强调当前目标、当前动作和验证方式。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"ide"}'),
    ('b1000000-0000-0000-0000-000000000005'::uuid,'claude-code-coach','Claude Code 工作流教练','teaching','Claude Code 工作流训练主教学 agent','你是 Claude Code 工作流教练，关注 CLI 上下文、任务切片和连续迭代。','不要直接给大段答案，先给一条可执行工作流建议。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000006'::uuid,'claude-debug-coach','Claude Code 调试教练','teaching','Claude Code 调试训练营主教学 agent','你是 Claude Code 调试教练，先要求问题复现、再组织线索、再形成假设。','优先给调试顺序，不直接跳到最终修复。','deepseek-v3-2',6,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000007'::uuid,'claude-shipping-coach','Claude Code 交付教练','teaching','Claude Code 功能交付主教学 agent','你是 Claude Code 交付教练，关注切片、实现顺序、联调和验收。','先让需求收窄成可交付切片，再进入实现。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000008'::uuid,'claude-code-self-study-coach','Claude Code 自学教练','teaching','Claude Code 自学模式主教学 agent','你是 Claude Code 自学教练，帮助用户把现有材料变成当前一步。','先收材料，再给当前一步。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000009'::uuid,'codex-cli-coach','Codex CLI 工作流教练','teaching','Codex CLI 工作流训练主教学 agent','你是 Codex CLI 工作流教练，关注短提示、范围控制和结果验证。','优先让用户缩小任务范围并验证当前结果。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000010'::uuid,'codex-debug-coach','Codex CLI 调试教练','teaching','Codex CLI 调试训练营主教学 agent','你是 Codex CLI 调试教练，先固定复现，再组织调试线索和修复假设。','始终要求复测，不把解释当验证。','deepseek-v3-2',6,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000011'::uuid,'codex-shipping-coach','Codex CLI 交付教练','teaching','Codex CLI 功能交付主教学 agent','你是 Codex CLI 交付教练，关注切片、实现顺序和验收闭环。','先定义边界，再进入实现。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000012'::uuid,'codex-self-study-coach','Codex CLI 自学教练','teaching','Codex CLI 自学模式主教学 agent','你是 Codex CLI 自学教练，帮助用户把已有材料拆成当前一步。','先做当前一步，不要一次扩展太多。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000013'::uuid,'opencode-coach','OpenCode 工作流教练','teaching','OpenCode 工作流训练主教学 agent','你是 OpenCode 工作流教练，关注多语言上下文组织和稳定推进。','强调上下文相关性与验证顺序。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000014'::uuid,'opencode-self-study-coach','OpenCode 自学教练','teaching','OpenCode 自学模式主教学 agent','你是 OpenCode 自学教练，帮助用户围绕开源工具上下文推进学习。','先整理材料，再给当前一步。','deepseek-v3-2',8,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000015'::uuid,'stitch-buddy','Google Stitch 陪练','teaching','Google Stitch 起步营主教学 agent','你是 Google Stitch 陪练，帮助用户从描述到页面结果建立最小闭环。','优先给页面描述、可视化修改和复盘建议。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000016'::uuid,'stitch-self-study-coach','Google Stitch 自学教练','teaching','Google Stitch 自学模式主教学 agent','你是 Google Stitch 自学教练，帮助用户把页面想法变成当前一步。','先收窄到一页一改。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000017'::uuid,'bolt-buddy','Bolt.new 陪练','teaching','Bolt.new 起步营主教学 agent','你是 Bolt.new 陪练，帮助用户快速完成第一次在线实验。','优先最小实验，不追求一口气做全。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000018'::uuid,'bolt-self-study-coach','Bolt.new 自学教练','teaching','Bolt.new 自学模式主教学 agent','你是 Bolt.new 自学教练，帮助用户把现有页面想法拆成当前一步。','始终先验证一个最小结果。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000019'::uuid,'lovable-buddy','Lovable 陪练','teaching','Lovable 起步营主教学 agent','你是 Lovable 陪练，帮助用户从产品想法推进到页面雏形。','先把页面目标说清楚，再进入迭代。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000020'::uuid,'lovable-self-study-coach','Lovable 自学教练','teaching','Lovable 自学模式主教学 agent','你是 Lovable 自学教练，帮助用户把产品想法拆成当前一步。','避免一次做完整产品，优先当前页面。','deepseek-v3-2',8,2200,0.30::numeric,0.85::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000021'::uuid,'ide-blocked-helper','IDE 卡点排查助手','blocked_help','图形化 IDE 工具统一卡点排查 agent','你是 IDE 卡点排查助手，先确认上下文、再收集报错、再给检查顺序。','优先排查顺序，不直接给大段答案。','deepseek-v3-2',6,2200,0.20::numeric,0.80::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"ide"}'),
    ('b1000000-0000-0000-0000-000000000022'::uuid,'cli-blocked-helper','CLI 卡点排查助手','blocked_help','CLI 工具统一卡点排查 agent','你是 CLI 卡点排查助手，先固定复现，再收集命令输出与关键文件。','输出要包含检查顺序和最小下一步。','deepseek-v3-2',6,2600,0.20::numeric,0.80::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000023'::uuid,'web-builder-blocked-helper','在线工具卡点排查助手','blocked_help','在线页面生成工具统一卡点排查 agent','你是在线工具卡点排查助手，先确认页面目标、当前结果和差异点。','先定位差异，再给修改建议。','deepseek-v3-2',6,2200,0.20::numeric,0.80::numeric,'{"profileCode":"sf-balanced-default","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000024'::uuid,'ide-task-reviewer','IDE 任务复盘助手','task_review','图形化 IDE 任务复盘 agent','你是 IDE 任务复盘助手，帮助用户回看结果并指出下一轮修正重点。','复盘时先肯定完成，再指出一个最关键缺口。','glm-5',10,2800,0.40::numeric,0.90::numeric,'{"profileCode":"sf-longform-coach","toolFamily":"ide"}'),
    ('b1000000-0000-0000-0000-000000000025'::uuid,'cli-task-reviewer','CLI 任务复盘助手','task_review','CLI 工具任务复盘 agent','你是 CLI 任务复盘助手，帮助用户从 diff、输出和验证动作回看本轮结果。','优先指出验证缺口和下一步。','deepseek-v3-2',10,2600,0.30::numeric,0.85::numeric,'{"profileCode":"sf-code-workflow","toolFamily":"cli"}'),
    ('b1000000-0000-0000-0000-000000000026'::uuid,'web-builder-task-reviewer','在线工具任务复盘助手','task_review','在线工具任务复盘 agent','你是在线工具任务复盘助手，帮助用户从页面结果和目标差异进行回看。','优先页面目标、差异点和下一轮迭代。','glm-5',10,2800,0.40::numeric,0.90::numeric,'{"profileCode":"sf-longform-coach","toolFamily":"web-builder"}'),
    ('b1000000-0000-0000-0000-000000000027'::uuid,'learning-completion-coach','学习完成反馈教练','completion_feedback','统一完成反馈与成长总结 agent','你是学习完成反馈教练，负责给出完成反馈、成长感知和下一步建议。','总结要清楚、正向、具体，并且给出下一步。','glm-5',8,2800,0.40::numeric,0.90::numeric,'{"profileCode":"sf-longform-coach","toolFamily":"shared"}'),
    ('b1000000-0000-0000-0000-000000000028'::uuid,'learning-concept-qa-coach','学习概念问答教练','concept_qa','学习场景中的即时知识问答 agent，负责解释术语、概念和知识盲点，不打断当前步骤推进。','你是学习概念问答教练。用户可以在当前练习中随时提问概念、术语、原理、区别和知识盲点，你需要给出即时、专业、简洁、可执行的中文解答。回答时优先直接解释概念，再补一个和当前学习场景有关的例子；不要把问题强行拐回下一步，也不要把答疑伪装成任务推进。','保持回答聚焦在概念本身；如需引用当前路径上下文，可结合当前关卡解释，但不要越级扩展到无关主题。','glm-5',10,2800,0.35::numeric,0.90::numeric,'{"profileCode":"sf-longform-coach","toolFamily":"shared","role":"concept_qa"}')
) AS seed(
  id,
  code,
  name,
  scenario_type,
  description,
  system_prompt_template,
  developer_prompt_template,
  default_model_code,
  context_message_limit,
  max_output_tokens,
  temperature,
  top_p,
  metadata
)
ON CONFLICT (code) DO UPDATE
SET
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
  version = EXCLUDED.version,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

DELETE FROM public.agent_bindings
WHERE agent_code IN (
  'cursor-buddy',
  'cursor-self-study-coach',
  'trae-self-study-coach',
  'windsurf-self-study-coach',
  'claude-code-coach',
  'claude-debug-coach',
  'claude-shipping-coach',
  'claude-code-self-study-coach',
  'codex-cli-coach',
  'codex-debug-coach',
  'codex-shipping-coach',
  'codex-self-study-coach',
  'opencode-coach',
  'opencode-self-study-coach',
  'stitch-buddy',
  'stitch-self-study-coach',
  'bolt-buddy',
  'bolt-self-study-coach',
  'lovable-buddy',
  'lovable-self-study-coach',
  'ide-blocked-helper',
  'cli-blocked-helper',
  'web-builder-blocked-helper',
  'ide-task-reviewer',
  'cli-task-reviewer',
  'web-builder-task-reviewer',
  'learning-completion-coach',
  'learning-concept-qa-coach'
);

WITH path_bindings AS (
  SELECT
    seed.agent_code,
    path.id AS path_id,
    path.tool_id,
    seed.selection_mode::public.path_selection_mode AS selection_mode
  FROM (
    VALUES
      ('cursor-quickstart','cursor-buddy','preset_training'),
      ('path-cursor-beginner-self-study','cursor-self-study-coach','self_directed'),
      ('path-trae-beginner-self-study','trae-self-study-coach','self_directed'),
      ('path-windsurf-intermediate-self-study','windsurf-self-study-coach','self_directed'),
      ('path-claude-code-intermediate-workflow-boost','claude-code-coach','preset_training'),
      ('path-claude-code-intermediate-debug-lab','claude-debug-coach','preset_training'),
      ('path-claude-code-intermediate-feature-shipping','claude-shipping-coach','preset_training'),
      ('path-claude-code-intermediate-self-study','claude-code-self-study-coach','self_directed'),
      ('path-codex-intermediate-workflow-boost','codex-cli-coach','preset_training'),
      ('path-codex-intermediate-debug-lab','codex-debug-coach','preset_training'),
      ('path-codex-intermediate-feature-shipping','codex-shipping-coach','preset_training'),
      ('path-codex-intermediate-self-study','codex-self-study-coach','self_directed'),
      ('path-opencode-intermediate-workflow-boost','opencode-coach','preset_training'),
      ('path-opencode-intermediate-self-study','opencode-self-study-coach','self_directed'),
      ('path-stitch-beginner-quickstart','stitch-buddy','preset_training'),
      ('path-stitch-beginner-self-study','stitch-self-study-coach','self_directed'),
      ('path-bolt-beginner-quickstart','bolt-buddy','preset_training'),
      ('path-bolt-beginner-self-study','bolt-self-study-coach','self_directed'),
      ('path-lovable-beginner-quickstart','lovable-buddy','preset_training'),
      ('path-lovable-beginner-self-study','lovable-self-study-coach','self_directed')
  ) AS seed(path_code, agent_code, selection_mode)
  JOIN public.learning_paths AS path
    ON path.code = seed.path_code
),
agent_binding_rows AS (
  SELECT
    gen_random_uuid() AS id,
    pb.agent_code,
    pb.tool_id,
    NULL::public.learning_level AS learning_level,
    pb.selection_mode,
    pb.path_id,
    NULL::integer AS step_no,
    'teaching'::varchar(32) AS interaction_type,
    10 AS priority,
    true AS is_active,
    jsonb_build_object('bindingKind', 'path_primary') AS metadata
  FROM path_bindings AS pb

  UNION ALL

  SELECT
    gen_random_uuid(),
    pb.agent_code,
    pb.tool_id,
    NULL::public.learning_level,
    pb.selection_mode,
    pb.path_id,
    NULL::integer,
    'path_guidance',
    20,
    true,
    jsonb_build_object('bindingKind', 'path_primary')
  FROM path_bindings AS pb

  UNION ALL

  SELECT
    gen_random_uuid(),
    CASE
      WHEN tool.code IN ('cursor', 'trae', 'windsurf') THEN 'ide-blocked-helper'
      WHEN tool.code IN ('claude-code', 'codex', 'opencode') THEN 'cli-blocked-helper'
      ELSE 'web-builder-blocked-helper'
    END,
    tool.id,
    NULL::public.learning_level,
    NULL::public.path_selection_mode,
    NULL::uuid,
    NULL::integer,
    'blocked_help',
    100,
    true,
    jsonb_build_object('bindingKind', 'tool_family_helper')
  FROM public.learning_tools AS tool
  WHERE tool.code IN (
    'cursor', 'trae', 'windsurf',
    'claude-code', 'codex', 'opencode',
    'stitch', 'bolt', 'lovable'
  )

  UNION ALL

  SELECT
    gen_random_uuid(),
    CASE
      WHEN tool.code IN ('cursor', 'trae', 'windsurf') THEN 'ide-task-reviewer'
      WHEN tool.code IN ('claude-code', 'codex', 'opencode') THEN 'cli-task-reviewer'
      ELSE 'web-builder-task-reviewer'
    END,
    tool.id,
    NULL::public.learning_level,
    NULL::public.path_selection_mode,
    NULL::uuid,
    NULL::integer,
    'task_review',
    110,
    true,
    jsonb_build_object('bindingKind', 'tool_family_helper')
  FROM public.learning_tools AS tool
  WHERE tool.code IN (
    'cursor', 'trae', 'windsurf',
    'claude-code', 'codex', 'opencode',
    'stitch', 'bolt', 'lovable'
  )

  UNION ALL

  SELECT
    gen_random_uuid(),
    'learning-completion-coach',
    NULL::uuid,
    NULL::public.learning_level,
    NULL::public.path_selection_mode,
    NULL::uuid,
    NULL::integer,
    'completion_feedback',
    500,
    true,
    jsonb_build_object('bindingKind', 'global_fallback')
  UNION ALL

  SELECT
    gen_random_uuid(),
    'learning-concept-qa-coach',
    NULL::uuid,
    NULL::public.learning_level,
    NULL::public.path_selection_mode,
    NULL::uuid,
    NULL::integer,
    'concept_qa',
    400,
    true,
    jsonb_build_object('bindingKind', 'global_fallback')
)
INSERT INTO public.agent_bindings (
  id,
  agent_code,
  tool_id,
  learning_level,
  selection_mode,
  path_id,
  step_no,
  interaction_type,
  priority,
  is_active,
  metadata,
  created_at,
  updated_at
)
SELECT
  id,
  agent_code,
  tool_id,
  learning_level,
  selection_mode,
  path_id,
  step_no,
  interaction_type,
  priority,
  is_active,
  metadata,
  NOW(),
  NOW()
FROM agent_binding_rows
ON CONFLICT DO NOTHING;

COMMIT;
