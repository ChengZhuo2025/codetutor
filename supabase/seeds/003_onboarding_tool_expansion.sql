BEGIN;

-- expand onboarding tools to match the current 9-tool frontend prototype
INSERT INTO public.learning_tools (
  id,
  code,
  name,
  tool_type,
  difficulty_level,
  is_active,
  sort_order,
  metadata,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-4444-4444-4444-444444444444'::uuid,
    'claude-code',
    'Claude Code',
    'cli',
    'intermediate',
    true,
    40,
    '{"summary":"终端里与 AI 结对编程，适合练命令行工作流","category":"CLI 工具","color":"chart-3","popular":true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '11111111-5555-5555-5555-555555555555'::uuid,
    'codex',
    'Codex CLI',
    'cli',
    'intermediate',
    true,
    50,
    '{"summary":"轻量命令行，适合快速在仓库里改代码","category":"CLI 工具","color":"chart-5","popular":false}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '11111111-6666-6666-6666-666666666666'::uuid,
    'opencode',
    'OpenCode',
    'cli',
    'intermediate',
    true,
    60,
    '{"summary":"开源、可自托管，多语言与框架都方便","category":"CLI 工具","color":"brand","popular":true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '11111111-7777-7777-7777-777777777777'::uuid,
    'stitch',
    'Google Stitch',
    'web',
    'beginner',
    true,
    70,
    '{"summary":"偏网页与界面生成，适合快速出高保真原型","category":"在线工具","color":"brand","popular":true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '11111111-8888-8888-8888-888888888888'::uuid,
    'bolt',
    'Bolt.new',
    'web',
    'beginner',
    true,
    80,
    '{"summary":"浏览器里跑起来，免安装，适合先试想法","category":"在线工具","color":"gold","popular":false}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '11111111-9999-9999-9999-999999999999'::uuid,
    'lovable',
    'Lovable',
    'web',
    'beginner',
    true,
    90,
    '{"summary":"从想法到页面一条龙，适合产品向快速试错","category":"在线工具","color":"gold","popular":false}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  tool_type = EXCLUDED.tool_type,
  difficulty_level = EXCLUDED.difficulty_level,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- minimal preset-training paths so every newly added tool can complete onboarding in platform mode
INSERT INTO public.learning_paths (
  id,
  tool_id,
  code,
  name,
  target_level,
  source_type,
  version,
  is_default,
  is_active,
  agent_code,
  stage_count,
  description,
  metadata,
  created_at,
  updated_at
)
SELECT
  seed.id,
  lt.id,
  seed.code,
  seed.name,
  seed.target_level::public.learning_level,
  'preset_training',
  1,
  true,
  true,
  seed.agent_code,
  3,
  seed.description,
  seed.metadata::jsonb,
  NOW(),
  NOW()
FROM (
  VALUES
    (
      '66666666-4444-4444-4444-444444444444'::uuid,
      'claude-code',
      'path-claude-code-intermediate-workflow-boost',
      'Claude Code 效率工作流训练',
      'intermediate',
      'claude-code-coach',
      '围绕 Claude Code 的任务拆解、上下文管理和连续迭代，建立稳定 CLI 协作节奏。',
      '{
        "summary":"围绕 Claude Code 的任务拆解、上下文管理和连续迭代，建立高频 CLI 协作工作流。",
        "recommended":true,
        "currentLevelFit":"适合已经会写代码，但想把 Claude Code 接入日常开发的人",
        "coachAgentLabel":"效率与协作",
        "estimatedDuration":"4-6 天",
        "tags":["任务拆解","上下文管理","CLI 节奏"],
        "preview":["整理工作区上下文","拆分一次最小交付任务","完成一次 CLI 协作闭环"]
      }'
    ),
    (
      '66666666-5555-5555-5555-555555555555'::uuid,
      'codex',
      'path-codex-intermediate-workflow-boost',
      'Codex CLI 效率工作流训练',
      'intermediate',
      'codex-cli-coach',
      '围绕 Codex CLI 的轻量提示、任务推进和结果验证，建立高效命令行协作方式。',
      '{
        "summary":"围绕 Codex CLI 的轻量提示、任务推进和结果验证，建立稳定的命令行协作手感。",
        "recommended":true,
        "currentLevelFit":"适合有一定基础，想提升 CLI 协作效率的用户",
        "coachAgentLabel":"CLI 节奏与验证",
        "estimatedDuration":"3-5 天",
        "tags":["CLI 提示","任务推进","验证结果"],
        "preview":["明确当前任务目标","控制一次最小输出范围","完成一次验证与收口"]
      }'
    ),
    (
      '66666666-6666-6666-6666-666666666666'::uuid,
      'opencode',
      'path-opencode-intermediate-workflow-boost',
      'OpenCode 效率工作流训练',
      'intermediate',
      'opencode-coach',
      '围绕 OpenCode 的开源工作流和多语言场景，建立更稳定的上下文组织方式。',
      '{
        "summary":"围绕 OpenCode 的开源工作流和多语言场景，建立稳定的上下文组织与任务推进方式。",
        "recommended":false,
        "currentLevelFit":"适合想在开源工具环境下建立 AI 编程方法的人",
        "coachAgentLabel":"开源工作流",
        "estimatedDuration":"4-6 天",
        "tags":["开源工具","上下文组织","多语言协作"],
        "preview":["理解工具能力边界","准备一份有效上下文","完成一次任务推进与复盘"]
      }'
    ),
    (
      '66666666-7777-7777-7777-777777777777'::uuid,
      'stitch',
      'path-stitch-beginner-quickstart',
      'Google Stitch 零基础起步营',
      'beginner',
      'stitch-buddy',
      '从第一次页面生成到第一次迭代修改，建立 Google Stitch 的最小使用闭环。',
      '{
        "summary":"从第一次页面生成到第一次迭代修改，建立最小但完整的 Google Stitch 入门闭环。",
        "recommended":true,
        "currentLevelFit":"适合第一次用在线工具生成页面的新用户",
        "coachAgentLabel":"页面生成陪练",
        "estimatedDuration":"2-4 天",
        "tags":["页面生成","可视化修改","快速试错"],
        "preview":["生成首个页面","追加一次细节修改","完成一次结果复盘"]
      }'
    ),
    (
      '66666666-8888-8888-8888-888888888888'::uuid,
      'bolt',
      'path-bolt-beginner-quickstart',
      'Bolt.new 零基础起步营',
      'beginner',
      'bolt-buddy',
      '围绕 Bolt.new 的零安装体验，完成第一次从描述到运行结果的最小实验。',
      '{
        "summary":"围绕 Bolt.new 的零安装体验，完成第一次从描述到运行结果的最小实验。",
        "recommended":false,
        "currentLevelFit":"适合想快速试验点子、几乎零门槛起步的用户",
        "coachAgentLabel":"快速实验",
        "estimatedDuration":"2-3 天",
        "tags":["零安装","快速实验","浏览器运行"],
        "preview":["写出第一个页面描述","跑通一次在线生成","完成一次修改与验证"]
      }'
    ),
    (
      '66666666-9999-9999-9999-999999999999'::uuid,
      'lovable',
      'path-lovable-beginner-quickstart',
      'Lovable 零基础起步营',
      'beginner',
      'lovable-buddy',
      '围绕 Lovable 的产品和页面生成能力，完成第一次从想法到页面雏形的练习。',
      '{
        "summary":"围绕 Lovable 的产品和页面生成能力，完成第一次从想法到页面雏形的完整练习。",
        "recommended":false,
        "currentLevelFit":"适合更偏产品构思与页面快速试错的入门用户",
        "coachAgentLabel":"产品原型",
        "estimatedDuration":"2-4 天",
        "tags":["产品原型","页面生成","快速试错"],
        "preview":["明确页面目标","生成第一个版本","完成一次迭代与复盘"]
      }'
    )
) AS seed(id, tool_code, code, name, target_level, agent_code, description, metadata)
JOIN public.learning_tools lt
  ON lt.code = seed.tool_code
ON CONFLICT (code) DO UPDATE
SET
  tool_id = EXCLUDED.tool_id,
  name = EXCLUDED.name,
  target_level = EXCLUDED.target_level,
  source_type = EXCLUDED.source_type,
  agent_code = EXCLUDED.agent_code,
  stage_count = EXCLUDED.stage_count,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- self-directed paths for the six newly added tools
INSERT INTO public.learning_paths (
  id,
  tool_id,
  code,
  name,
  target_level,
  source_type,
  version,
  is_default,
  is_active,
  agent_code,
  stage_count,
  description,
  metadata,
  created_at,
  updated_at
)
SELECT
  seed.id,
  lt.id,
  seed.code,
  seed.name,
  seed.target_level::public.learning_level,
  'self_directed',
  1,
  false,
  true,
  NULL,
  3,
  seed.description,
  seed.metadata::jsonb,
  NOW(),
  NOW()
FROM (
  VALUES
    (
      '77777770-4444-4444-4444-444444444444'::uuid,
      'claude-code',
      'path-claude-code-intermediate-self-study',
      'Claude Code 自主学习模式',
      'intermediate',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Claude Code」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Claude Code」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    ),
    (
      '77777770-5555-5555-5555-555555555555'::uuid,
      'codex',
      'path-codex-intermediate-self-study',
      'Codex CLI 自主学习模式',
      'intermediate',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Codex CLI」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Codex CLI」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    ),
    (
      '77777770-6666-6666-6666-666666666666'::uuid,
      'opencode',
      'path-opencode-intermediate-self-study',
      'OpenCode 自主学习模式',
      'intermediate',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「OpenCode」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「OpenCode」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    ),
    (
      '77777770-7777-7777-7777-777777777777'::uuid,
      'stitch',
      'path-stitch-beginner-self-study',
      'Google Stitch 自主学习模式',
      'beginner',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Google Stitch」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Google Stitch」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    ),
    (
      '77777770-8888-8888-8888-888888888888'::uuid,
      'bolt',
      'path-bolt-beginner-self-study',
      'Bolt.new 自主学习模式',
      'beginner',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Bolt.new」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Bolt.new」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    ),
    (
      '77777770-9999-9999-9999-999999999999'::uuid,
      'lovable',
      'path-lovable-beginner-self-study',
      'Lovable 自主学习模式',
      'beginner',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Lovable」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Lovable」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    )
) AS seed(id, tool_code, code, name, target_level, description, metadata)
JOIN public.learning_tools lt
  ON lt.code = seed.tool_code
ON CONFLICT (code) DO UPDATE
SET
  tool_id = EXCLUDED.tool_id,
  name = EXCLUDED.name,
  target_level = EXCLUDED.target_level,
  source_type = EXCLUDED.source_type,
  stage_count = EXCLUDED.stage_count,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- generic preset starter steps for the six newly added preset paths
WITH preset_paths AS (
  SELECT id, code, name
  FROM public.learning_paths
  WHERE source_type = 'preset_training'
    AND code IN (
      'path-claude-code-intermediate-workflow-boost',
      'path-codex-intermediate-workflow-boost',
      'path-opencode-intermediate-workflow-boost',
      'path-stitch-beginner-quickstart',
      'path-bolt-beginner-quickstart',
      'path-lovable-beginner-quickstart'
    )
),
preset_step_templates AS (
  SELECT
    1 AS step_no,
    '建立最小工作流上下文' AS title,
    '先明确当前工具的输入方式、工作区边界和这次练习的目标。' AS summary,
    '不要一开始追求完整结果，先让工具理解你当前要完成的一步。' AS focus,
    '整理出一个当前可以立即执行的最小任务。' AS goal,
    '至少明确一次任务目标、输入材料和预期产出。' AS completion_criteria,
    '你已经建立了最小工作流上下文，后续可以稳定进入实际操作。' AS review_summary,
    8 AS estimated_minutes,
    10 AS reward_score,
    '["目标明确","上下文准备"]'::jsonb AS knowledge_points,
    '["先明确目标和上下文，再开始交互。"]'::jsonb AS key_points,
    '[{"text":"一开始就追求完整项目，通常会让结果发散。","isTrap":true}]'::jsonb AS pitfalls
  UNION ALL
  SELECT
    2,
    '完成第一次有效协作',
    '围绕当前最小任务，完成一次真实生成、修改或调试协作。' AS summary,
    '重点不是多，而是要看到一次完整可验证的结果。' AS focus,
    '完成一次最小但真实的 AI 协作闭环。' AS goal,
    '至少完成一次生成或修改，并看到可验证的结果。' AS completion_criteria,
    '你已经跑通了第一次有效协作，知道怎样把需求变成结果。' AS review_summary,
    10,
    15,
    '["最小协作","结果验证"]'::jsonb,
    '["先拿到第一个可验证结果，再继续扩展。"]'::jsonb,
    '[{"text":"没有验证结果就进入下一步，会让后续问题累积。","isTrap":true}]'::jsonb
  UNION ALL
  SELECT
    3,
    '复盘并推进下一步',
    '回顾这次协作哪里顺利、哪里卡住，并整理下一步要继续练的重点。' AS summary,
    '真正的学习不止于做完，还要能复盘和继续推进。' AS focus,
    '完成一次结果复盘并明确下一步。' AS goal,
    '至少记录一个收获、一个卡点和下一步打算。' AS completion_criteria,
    '你已经完成最小训练闭环，可以继续进入更完整的工具工作流。' AS review_summary,
    12,
    20,
    '["结果复盘","下一步判断"]'::jsonb,
    '["每次完成后都要知道自己下一步练什么。"]'::jsonb,
    '[{"text":"只完成任务不做复盘，会让经验难以迁移。","isTrap":true}]'::jsonb
)
INSERT INTO public.path_steps (
  id,
  path_id,
  step_no,
  title,
  summary,
  focus,
  goal,
  completion_criteria,
  review_summary,
  estimated_minutes,
  reward_score,
  knowledge_points,
  key_points,
  pitfalls,
  difficulty_weight,
  is_required,
  metadata,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  pp.id,
  tpl.step_no,
  tpl.title,
  tpl.summary,
  tpl.focus,
  tpl.goal,
  tpl.completion_criteria,
  tpl.review_summary,
  tpl.estimated_minutes,
  tpl.reward_score,
  tpl.knowledge_points,
  tpl.key_points,
  tpl.pitfalls,
  1,
  true,
  jsonb_build_object('pathCode', pp.code, 'pathName', pp.name),
  NOW(),
  NOW()
FROM preset_paths pp
CROSS JOIN preset_step_templates tpl
ON CONFLICT (path_id, step_no) DO UPDATE
SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  focus = EXCLUDED.focus,
  goal = EXCLUDED.goal,
  completion_criteria = EXCLUDED.completion_criteria,
  review_summary = EXCLUDED.review_summary,
  estimated_minutes = EXCLUDED.estimated_minutes,
  reward_score = EXCLUDED.reward_score,
  knowledge_points = EXCLUDED.knowledge_points,
  key_points = EXCLUDED.key_points,
  pitfalls = EXCLUDED.pitfalls,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- generic self-directed starter steps for the six newly added self-study paths
WITH self_paths AS (
  SELECT id, code, name
  FROM public.learning_paths
  WHERE source_type = 'self_directed'
    AND code IN (
      'path-claude-code-intermediate-self-study',
      'path-codex-intermediate-self-study',
      'path-opencode-intermediate-self-study',
      'path-stitch-beginner-self-study',
      'path-bolt-beginner-self-study',
      'path-lovable-beginner-self-study'
    )
),
self_step_templates AS (
  SELECT
    1 AS step_no,
    '整理学习材料' AS title,
    '把你现有的教程、代码片段或链接整理成一份当前可学习素材。' AS summary,
    '先把上下文聚合起来，后面 AI 才能稳定给出下一步。' AS focus,
    '准备一份可直接交给 AI 的学习材料。' AS goal,
    '至少整理出一份教程文本、一个链接或一段代码片段。' AS completion_criteria,
    '你已经把学习材料聚拢起来，接下来可以让 AI 帮你拆解。' AS review_summary,
    8 AS estimated_minutes,
    10 AS reward_score,
    '["材料整理","上下文准备"]'::jsonb AS knowledge_points,
    '["先聚合上下文，再向 AI 提问。"]'::jsonb AS key_points,
    '[{"text":"不要一次贴入过多无关内容，先提交当前最相关材料。","isTrap":true}]'::jsonb AS pitfalls
  UNION ALL
  SELECT
    2,
    '拆出当前一步',
    '让 AI 根据你的材料，告诉你「这一步先做什么」。' AS summary,
    '不必一次规划整门课，先拿到眼前这一步。' AS focus,
    '获得一个可以立刻开始执行的任务。' AS goal,
    'AI 输出一个清晰、单步、可执行的当前任务。' AS completion_criteria,
    '你已经拿到了当前一步，接下来进入实际执行。' AS review_summary,
    10,
    15,
    '["任务拆解","最小步推进"]'::jsonb,
    '["先做当前一步，比一次规划完整路径更有效。"]'::jsonb,
    '[{"text":"不要让 AI 一次规划过大的范围，先收窄到当前一步。","isTrap":true}]'::jsonb
  UNION ALL
  SELECT
    3,
    '执行并复盘',
    '完成当前一步并记录哪里顺利、哪里卡住。' AS summary,
    '执行和复盘是自学模式真正形成反馈闭环的关键。' AS focus,
    '完成一次执行与复盘闭环。' AS goal,
    '至少完成一次尝试，并记录一个问题点或一个收获。' AS completion_criteria,
    '你已经跑通一次自学闭环，后续可以继续滚动推进。' AS review_summary,
    12,
    20,
    '["执行反馈","复盘"]'::jsonb,
    '["自学模式的关键不是一次学完，而是稳定形成反馈闭环。"]'::jsonb,
    '[{"text":"只看不做会让学习材料越积越多，必须进入一次真实执行。","isTrap":true}]'::jsonb
)
INSERT INTO public.path_steps (
  id,
  path_id,
  step_no,
  title,
  summary,
  focus,
  goal,
  completion_criteria,
  review_summary,
  estimated_minutes,
  reward_score,
  knowledge_points,
  key_points,
  pitfalls,
  difficulty_weight,
  is_required,
  metadata,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  sp.id,
  tpl.step_no,
  tpl.title,
  tpl.summary,
  tpl.focus,
  tpl.goal,
  tpl.completion_criteria,
  tpl.review_summary,
  tpl.estimated_minutes,
  tpl.reward_score,
  tpl.knowledge_points,
  tpl.key_points,
  tpl.pitfalls,
  1,
  true,
  jsonb_build_object('pathCode', sp.code, 'pathName', sp.name),
  NOW(),
  NOW()
FROM self_paths sp
CROSS JOIN self_step_templates tpl
ON CONFLICT (path_id, step_no) DO UPDATE
SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  focus = EXCLUDED.focus,
  goal = EXCLUDED.goal,
  completion_criteria = EXCLUDED.completion_criteria,
  review_summary = EXCLUDED.review_summary,
  estimated_minutes = EXCLUDED.estimated_minutes,
  reward_score = EXCLUDED.reward_score,
  knowledge_points = EXCLUDED.knowledge_points,
  key_points = EXCLUDED.key_points,
  pitfalls = EXCLUDED.pitfalls,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMIT;
