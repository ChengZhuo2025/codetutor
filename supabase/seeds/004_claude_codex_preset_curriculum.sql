BEGIN;

-- expand Claude Code and Codex preset curriculum so platform mode has fuller course choices
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
  'intermediate',
  'preset_training',
  1,
  seed.is_default,
  true,
  seed.agent_code,
  seed.stage_count,
  seed.description,
  seed.metadata::jsonb,
  NOW(),
  NOW()
FROM (
  VALUES
    (
      '88888880-1111-1111-1111-111111111111'::uuid,
      'claude-code',
      'path-claude-code-intermediate-workflow-boost',
      'Claude Code 效率工作流训练',
      true,
      'claude-code-coach',
      6,
      '围绕 Claude Code 的任务拆解、上下文管理和连续迭代，建立稳定的 CLI 工作流。',
      '{
        "summary":"围绕 Claude Code 的任务拆解、上下文管理和连续迭代，建立高频 CLI 协作工作流。",
        "recommended":true,
        "currentLevelFit":"适合已经会写代码，但想把 Claude Code 接入日常开发的人",
        "coachAgentLabel":"效率与协作",
        "estimatedDuration":"4-6 天",
        "tags":["任务拆解","上下文管理","CLI 节奏"],
        "preview":["理解工作区与上下文边界","拆分一次最小交付任务","完成一次 CLI 交付闭环"]
      }'
    ),
    (
      '88888880-1111-1111-1111-222222222222'::uuid,
      'claude-code',
      'path-claude-code-intermediate-debug-lab',
      'Claude Code 调试训练营',
      false,
      'claude-debug-coach',
      5,
      '练习用 Claude Code 快速定位问题、整理上下文并完成修复验证。',
      '{
        "summary":"练习用 Claude Code 快速定位问题、给出假设并验证修复。",
        "recommended":false,
        "currentLevelFit":"适合已经能写出来，但卡在排错效率上的用户",
        "coachAgentLabel":"调试专项",
        "estimatedDuration":"3-4 天",
        "tags":["调试","定位问题","验证修复"],
        "preview":["复现一次真实问题","组织错误上下文","输出修复结论"]
      }'
    ),
    (
      '88888880-1111-1111-1111-333333333333'::uuid,
      'claude-code',
      'path-claude-code-intermediate-feature-shipping',
      'Claude Code 小功能交付路径',
      false,
      'claude-shipping-coach',
      6,
      '以真实功能交付为主线，练习如何让 Claude Code 参与需求到验收全过程。',
      '{
        "summary":"以真实功能交付为主线，练习如何让 Claude Code 参与需求到上线全过程。",
        "recommended":false,
        "currentLevelFit":"适合想把 AI 真正接入日常开发的人",
        "coachAgentLabel":"交付陪跑",
        "estimatedDuration":"1 周",
        "tags":["需求实现","联调","上线准备"],
        "preview":["写实现计划","完成一个功能切片","联调并验收"]
      }'
    ),
    (
      '88888880-2222-2222-2222-111111111111'::uuid,
      'codex',
      'path-codex-intermediate-workflow-boost',
      'Codex CLI 效率工作流训练',
      true,
      'codex-cli-coach',
      6,
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
      '88888880-2222-2222-2222-222222222222'::uuid,
      'codex',
      'path-codex-intermediate-debug-lab',
      'Codex CLI 调试训练营',
      false,
      'codex-debug-coach',
      5,
      '练习用 Codex CLI 在命令行环境里组织问题上下文并完成一次有效调试闭环。',
      '{
        "summary":"练习用 Codex CLI 在命令行环境里快速定位问题、给出假设并验证修复。",
        "recommended":false,
        "currentLevelFit":"适合会写代码，但希望提升命令行排错效率的用户",
        "coachAgentLabel":"调试专项",
        "estimatedDuration":"3-4 天",
        "tags":["调试","命令行","验证修复"],
        "preview":["复现一次真实报错","组织调试线索","输出修复与验证结论"]
      }'
    ),
    (
      '88888880-2222-2222-2222-333333333333'::uuid,
      'codex',
      'path-codex-intermediate-feature-shipping',
      'Codex CLI 小功能交付路径',
      false,
      'codex-shipping-coach',
      6,
      '以真实小功能交付为主线，练习如何让 Codex CLI 参与从需求到验收的完整过程。',
      '{
        "summary":"以真实小功能交付为主线，练习如何让 Codex CLI 参与需求到上线全过程。",
        "recommended":false,
        "currentLevelFit":"适合想把 Codex CLI 真正接入日常开发的人",
        "coachAgentLabel":"交付陪跑",
        "estimatedDuration":"1 周",
        "tags":["需求实现","联调","上线准备"],
        "preview":["写实现计划","完成一个功能切片","联调并验收"]
      }'
    )
) AS seed(id, tool_code, code, name, is_default, agent_code, stage_count, description, metadata)
JOIN public.learning_tools lt
  ON lt.code = seed.tool_code
ON CONFLICT (code) DO UPDATE
SET
  tool_id = EXCLUDED.tool_id,
  name = EXCLUDED.name,
  target_level = EXCLUDED.target_level,
  source_type = EXCLUDED.source_type,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  agent_code = EXCLUDED.agent_code,
  stage_count = EXCLUDED.stage_count,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Claude Code detailed preset steps
WITH path AS (
  SELECT id AS path_id FROM public.learning_paths WHERE code = 'path-claude-code-intermediate-workflow-boost'
)
INSERT INTO public.path_steps (
  id, path_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight,
  is_required, metadata, created_at, updated_at
)
SELECT
  data.step_id, path.path_id, data.step_no, data.title, data.summary, data.focus, data.goal,
  data.completion_criteria, data.review_summary, data.estimated_minutes, data.reward_score,
  data.knowledge_points::jsonb, data.key_points::jsonb, data.pitfalls::jsonb, data.difficulty_weight,
  true, '{}'::jsonb, NOW(), NOW()
FROM (
  VALUES
    ('91000000-1111-1111-1111-000000000001'::uuid,1,'认识 Claude Code 的工作区与入口','明确 Claude Code 适合处理什么任务，以及一次交互前需要准备哪些上下文。','先建立正确心智，后续工作流才会稳定。','完成一次可运行项目目录下的 Claude Code 基础启动。','能在项目目录中正常启动并确认 Claude Code 可以读取当前仓库上下文。','你已经建立了最小工作区上下文，后续可以进入真实任务。',8,10,'["工作区上下文","CLI 启动"]','["先在正确目录启动工具。","让工具先理解当前仓库边界。"]','[{"text":"在错误目录启动 Claude Code 会导致上下文错位。","isTrap":true}]',1),
    ('91000000-1111-1111-1111-000000000002'::uuid,2,'拆解一个最小交付任务','围绕真实需求，把“大任务”拆成 Claude Code 能稳定执行的最小切片。','CLI 协作效率取决于你能否收窄目标。','输出一份可执行的最小任务描述。','至少拆出一个有边界、有输入、有验收标准的小任务。','你已经掌握了任务切片的基本方法。',10,10,'["任务拆解","边界定义"]','["先定义边界，再让 AI 动手。"]','[{"text":"目标过大时，输出往往会发散。","isTrap":true}]',1),
    ('91000000-1111-1111-1111-000000000003'::uuid,3,'组织上下文与约束','给 Claude Code 提供刚好够用的文件、背景和约束，不多也不少。','上下文质量比提示词长度更重要。','完成一次有效的上下文组织。','能明确说明当前任务关联的文件、限制条件和预期输出。','你已经理解何时扩大上下文、何时保持聚焦。',12,15,'["上下文组织","约束表达"]','["相关上下文比大量上下文更重要。"]','[{"text":"一次塞入过多无关文件会稀释重点。","isTrap":true}]',1),
    ('91000000-1111-1111-1111-000000000004'::uuid,4,'连续两轮迭代修改','在第一次输出基础上继续追问、修正和推进，形成多轮 CLI 协作节奏。','真正的工作流不止一轮，而是连续推进。','完成至少两轮连续修改与收敛。','第二轮输出明显比第一轮更接近目标，且你知道为什么。','你已经体验到连续迭代比一次性全做完更稳定。',12,15,'["连续迭代","反馈收敛"]','["每一轮都要基于前一轮结果继续收敛。"]','[{"text":"每轮都换一套目标会导致 AI 难以收敛。","isTrap":true}]',1),
    ('91000000-1111-1111-1111-000000000005'::uuid,5,'验证结果并补齐缺口','对 Claude Code 的输出做运行、检查和缺口确认，而不是直接接受文本结果。','交付质量来自验证，而不是生成本身。','完成一次输出验证并补齐一处缺口。','至少完成一次运行/检查，并指出一个实际缺口后修正。','你已经建立“生成后先验证”的基本动作。',10,20,'["结果验证","缺口识别"]','["AI 输出必须经过运行或检查验证。"]','[{"text":"只看文字说明不验证，是最常见的伪完成。","isTrap":true}]',1),
    ('91000000-1111-1111-1111-000000000006'::uuid,6,'复盘个人 CLI 协作流程','总结自己在 Claude Code 中有效的任务拆解、上下文组织和验证节奏。','把一次练习沉淀成可复用方法，后续效率才会持续提升。','输出一份你的个人 Claude Code 协作流程总结。','至少整理出 3 条适合自己的 CLI 协作准则。','你已经形成 Claude Code 的最小可复用工作流。',8,20,'["流程复盘","方法沉淀"]','["复盘能让方法从一次有效变成持续有效。"]','[{"text":"不复盘时，很多有效经验会在下次重新踩坑。","isTrap":true}]',2)
) AS data(
  step_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight
)
CROSS JOIN path
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
  difficulty_weight = EXCLUDED.difficulty_weight,
  updated_at = NOW();

WITH path AS (
  SELECT id AS path_id FROM public.learning_paths WHERE code = 'path-claude-code-intermediate-debug-lab'
)
INSERT INTO public.path_steps (
  id, path_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight,
  is_required, metadata, created_at, updated_at
)
SELECT
  data.step_id, path.path_id, data.step_no, data.title, data.summary, data.focus, data.goal,
  data.completion_criteria, data.review_summary, data.estimated_minutes, data.reward_score,
  data.knowledge_points::jsonb, data.key_points::jsonb, data.pitfalls::jsonb, data.difficulty_weight,
  true, '{}'::jsonb, NOW(), NOW()
FROM (
  VALUES
    ('91000000-1111-1111-2222-000000000001'::uuid,1,'复现并固定一个真实问题','先挑一个可重复出现的问题，避免调试目标漂移。','调试效率建立在问题稳定复现上。','整理出一份可复现的问题描述。','能稳定复现一次问题，并记录触发方式。','你已经固定调试目标，后续可以高效推进。',8,10,'["问题复现","目标固定"]','["先复现，再分析。"]','[{"text":"无法复现的问题很难高效调试。","isTrap":true}]',1),
    ('91000000-1111-1111-2222-000000000002'::uuid,2,'组织报错与相关代码上下文','把报错、关键文件和怀疑点一起交给 Claude Code。','AI 调试效果高度依赖你提供的上下文质量。','输出一份有效的调试上下文。','至少提供报错文本、关键文件和当前怀疑点。','你已经掌握调试上下文组织的最小标准。',10,10,'["调试上下文","关键线索"]','["报错 + 相关代码 + 怀疑点，比单纯贴报错更有效。"]','[{"text":"只贴报错不贴上下文，会让排查质量大幅下降。","isTrap":true}]',1),
    ('91000000-1111-1111-2222-000000000003'::uuid,3,'让 Claude Code 给出修复假设','不是直接要答案，而是先拿到可验证的修复假设。','好的调试是先形成假设，再验证。','获得 1-2 个有根据的修复方向。','Claude Code 能解释为什么怀疑这些位置并给出修复建议。','你已经从“猜答案”切换到“验证假设”的调试方式。',12,15,'["修复假设","根因判断"]','["先理解为什么，再执行修改。"]','[{"text":"直接复制修复结果而不理解原因，后续容易继续卡住。","isTrap":true}]',1),
    ('91000000-1111-1111-2222-000000000004'::uuid,4,'执行修复并再次验证','根据假设完成修改，然后重新运行检查是否真正修复。','没有复测的修复不能算完成。','完成一次修改与复测闭环。','至少完成一次修复并验证问题消失或明显收敛。','你已经完成一次有效调试闭环。',12,15,'["执行修复","复测验证"]','["拿到修复方案后必须再次运行验证。"]','[{"text":"不复测就进入下一步，是最常见的假修复。","isTrap":true}]',1),
    ('91000000-1111-1111-2222-000000000005'::uuid,5,'沉淀调试检查单','把这次有效的排查顺序整理成下次可复用的检查单。','调试能力的关键是沉淀顺序和方法。','输出一份自己的 Claude Code 调试检查单。','至少记录 3 条下次还会复用的调试顺序。','你已经形成基本的命令行调试方法。',8,20,'["调试复盘","检查单"]','["能复用的方法，比一次修好更重要。"]','[{"text":"如果不沉淀检查单，下次通常还会重复摸索。","isTrap":true}]',2)
) AS data(
  step_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight
)
CROSS JOIN path
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
  difficulty_weight = EXCLUDED.difficulty_weight,
  updated_at = NOW();

WITH path AS (
  SELECT id AS path_id FROM public.learning_paths WHERE code = 'path-claude-code-intermediate-feature-shipping'
)
INSERT INTO public.path_steps (
  id, path_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight,
  is_required, metadata, created_at, updated_at
)
SELECT
  data.step_id, path.path_id, data.step_no, data.title, data.summary, data.focus, data.goal,
  data.completion_criteria, data.review_summary, data.estimated_minutes, data.reward_score,
  data.knowledge_points::jsonb, data.key_points::jsonb, data.pitfalls::jsonb, data.difficulty_weight,
  true, '{}'::jsonb, NOW(), NOW()
FROM (
  VALUES
    ('91000000-1111-1111-3333-000000000001'::uuid,1,'把需求收窄成一个功能切片','把真实需求控制在 Claude Code 可以稳定交付的范围内。','交付能力建立在合理切片上。','定义一个小而完整的功能切片。','至少明确一个可在本周完成的功能范围。','你已经建立交付边界，后续可以稳定推进。',8,10,'["功能切片","范围控制"]','["功能切片越清晰，AI 交付越稳定。"]','[{"text":"一开始就做太大功能，常常会拖慢整个交付节奏。","isTrap":true}]',1),
    ('91000000-1111-1111-3333-000000000002'::uuid,2,'写一版实现计划','先让 Claude Code 帮你梳理实现顺序、风险点和验收口径。','先计划，后编码，能显著减少返工。','输出一份可执行实现计划。','计划中至少包含步骤、风险和验收标准。','你已经知道如何让 AI 先帮你搭出执行框架。',10,10,'["实现计划","风险识别"]','["先计划后执行，返工会更少。"]','[{"text":"没有验收标准的计划很难真正完成。","isTrap":true}]',1),
    ('91000000-1111-1111-3333-000000000003'::uuid,3,'完成第一轮实现','围绕计划完成第一个可运行版本，不追求一口气做完全部细节。','交付节奏强调先拿到可运行版本。','完成第一轮可运行实现。','功能主体可运行，且主要流程可走通。','你已经把想法推进成第一版结果。',12,15,'["第一轮实现","可运行结果"]','["先拿到第一版可运行结果，再优化。"]','[{"text":"一开始就抠细节，常会拖慢主流程推进。","isTrap":true}]',1),
    ('91000000-1111-1111-3333-000000000004'::uuid,4,'补齐边界与异常处理','让 Claude Code 帮你补齐易漏的异常分支、提示文案和边界情况。','真实交付的差异常在边界处理。','补齐一轮边界与异常处理。','至少修正 1-2 个之前未覆盖的边界情况。','你已经开始从“能跑”走向“能交付”。',12,15,'["边界处理","异常情况"]','["交付质量常体现在异常分支。"]','[{"text":"只测主流程，不补异常分支，会让交付质量不稳。","isTrap":true}]',1),
    ('91000000-1111-1111-3333-000000000005'::uuid,5,'联调并验收','对照原计划完成联调检查与验收，确认功能真的达到预期。','没有验收，就无法判断交付是否完成。','完成一次最小联调与验收闭环。','能对照验收标准确认功能是否真正完成。','你已经完成一轮真实功能交付。',10,20,'["联调","验收"]','["按验收标准判断完成，而不是按感觉。"]','[{"text":"没有明确验收动作，功能常会停留在“看起来差不多”。","isTrap":true}]',1),
    ('91000000-1111-1111-3333-000000000006'::uuid,6,'复盘个人交付方法','总结自己如何用 Claude Code 做切片、计划、实现和验收。','方法沉淀后，下一次交付会更快。','输出一份自己的 Claude Code 交付流程总结。','至少整理出 3 条适合自己复用的交付准则。','你已经形成 Claude Code 的最小交付方法。',8,20,'["交付复盘","方法沉淀"]','["沉淀方法，才能持续放大效率。"]','[{"text":"不做方法复盘时，交付经验很难稳定复用。","isTrap":true}]',2)
) AS data(
  step_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight
)
CROSS JOIN path
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
  difficulty_weight = EXCLUDED.difficulty_weight,
  updated_at = NOW();

-- Codex detailed preset steps
WITH path AS (
  SELECT id AS path_id FROM public.learning_paths WHERE code = 'path-codex-intermediate-workflow-boost'
)
INSERT INTO public.path_steps (
  id, path_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight,
  is_required, metadata, created_at, updated_at
)
SELECT
  data.step_id, path.path_id, data.step_no, data.title, data.summary, data.focus, data.goal,
  data.completion_criteria, data.review_summary, data.estimated_minutes, data.reward_score,
  data.knowledge_points::jsonb, data.key_points::jsonb, data.pitfalls::jsonb, data.difficulty_weight,
  true, '{}'::jsonb, NOW(), NOW()
FROM (
  VALUES
    ('92000000-2222-2222-1111-000000000001'::uuid,1,'确认 Codex CLI 的输入边界','明确 Codex CLI 适合的任务边界，以及一次命令行协作前需要准备什么。','先理解工具边界，协作才会稳定。','在正确项目上下文中启动并验证 Codex CLI。','能在项目目录中完成一次有效的 Codex CLI 启动与交互。','你已经建立 Codex CLI 的最小使用场景。',8,10,'["CLI 边界","上下文准备"]','["先在正确上下文里使用 Codex CLI。"]','[{"text":"脱离项目上下文使用 CLI，往往拿不到有效结果。","isTrap":true}]',1),
    ('92000000-2222-2222-1111-000000000002'::uuid,2,'把任务压缩成最小提示','练习把需求压缩成 Codex CLI 易于理解和执行的短提示。','短而准的提示是 Codex CLI 的关键手感。','完成一次最小但准确的任务提示。','提示中至少包含目标、范围和限制条件。','你已经掌握 Codex CLI 的最小提示方法。',10,10,'["最小提示","范围控制"]','["短提示也必须有清晰边界。"]','[{"text":"提示太泛时，输出容易偏离真正目标。","isTrap":true}]',1),
    ('92000000-2222-2222-1111-000000000003'::uuid,3,'控制输出范围与修改节奏','让 Codex CLI 一次只处理一个小范围，并根据结果继续收敛。','范围可控时，结果更稳定。','完成一次可控范围内的 CLI 修改。','至少完成一次小范围修改，并确认为什么这样更稳定。','你已经理解如何控制 CLI 输出范围。',10,15,'["输出控制","收敛节奏"]','["一次只处理一个范围，后续更容易继续。"]','[{"text":"一次让 CLI 修改太多区域，会增加排查成本。","isTrap":true}]',1),
    ('92000000-2222-2222-1111-000000000004'::uuid,4,'完成两轮连续收敛','在第一轮输出基础上继续迭代，让结果逐步逼近真实目标。','持续收敛比一次性生成更适合命令行协作。','完成至少两轮连续收敛。','第二轮结果相较第一轮有明确改进。','你已经建立 Codex CLI 的连续协作节奏。',12,15,'["连续收敛","多轮协作"]','["每一轮都要基于当前结果继续优化。"]','[{"text":"每轮都推倒重来，会让上下文价值丢失。","isTrap":true}]',1),
    ('92000000-2222-2222-1111-000000000005'::uuid,5,'验证命令行结果','对 Codex CLI 的输出做运行、检查或 diff 验证，确认结果真的成立。','CLI 输出必须经过验证。','完成一次结果验证与缺口修正。','至少完成一次运行或 diff 检查，并修正一个明显缺口。','你已经建立了 Codex CLI 的验证动作。',10,20,'["结果验证","diff 检查"]','["命令行结果必须验证后再继续。"]','[{"text":"不做验证时，很容易把“看起来对”当成“真的对”。","isTrap":true}]',1),
    ('92000000-2222-2222-1111-000000000006'::uuid,6,'复盘你的 Codex CLI 方法','总结自己在 Codex CLI 中有效的提示方式、范围控制和验证顺序。','形成自己的方法后，CLI 才会越来越顺手。','输出一份个人 Codex CLI 使用准则。','至少整理出 3 条可复用的 Codex CLI 准则。','你已经形成 Codex CLI 的最小高频工作流。',8,20,'["方法复盘","CLI 心法"]','["把一次有效的方法写下来，后续效率会更稳。"]','[{"text":"没有方法沉淀时，很难持续放大 CLI 效率。","isTrap":true}]',2)
) AS data(
  step_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight
)
CROSS JOIN path
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
  difficulty_weight = EXCLUDED.difficulty_weight,
  updated_at = NOW();

WITH path AS (
  SELECT id AS path_id FROM public.learning_paths WHERE code = 'path-codex-intermediate-debug-lab'
)
INSERT INTO public.path_steps (
  id, path_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight,
  is_required, metadata, created_at, updated_at
)
SELECT
  data.step_id, path.path_id, data.step_no, data.title, data.summary, data.focus, data.goal,
  data.completion_criteria, data.review_summary, data.estimated_minutes, data.reward_score,
  data.knowledge_points::jsonb, data.key_points::jsonb, data.pitfalls::jsonb, data.difficulty_weight,
  true, '{}'::jsonb, NOW(), NOW()
FROM (
  VALUES
    ('92000000-2222-2222-2222-000000000001'::uuid,1,'固定一个可重复问题','先让问题稳定可复现，再进入 CLI 调试流程。','复现稳定是调试的前提。','整理出一份可重复触发的问题描述。','能稳定复现一次问题并记录触发条件。','你已经固定调试目标。',8,10,'["问题复现","条件固定"]','["先复现，再调试。"]','[{"text":"问题无法复现时，CLI 调试很容易跑偏。","isTrap":true}]',1),
    ('92000000-2222-2222-2222-000000000002'::uuid,2,'给 Codex CLI 提供调试线索','围绕报错、命令输出、关键文件与怀疑点组织调试输入。','调试效率取决于线索是否足够完整。','完成一次有效调试线索整理。','至少提供报错信息、相关文件和一个怀疑方向。','你已经掌握 Codex CLI 的调试输入结构。',10,10,'["调试线索","上下文组织"]','["报错 + 上下文 + 怀疑点，质量最高。"]','[{"text":"只有命令输出没有代码上下文，常会导致误判。","isTrap":true}]',1),
    ('92000000-2222-2222-2222-000000000003'::uuid,3,'生成修复假设与检查顺序','让 Codex CLI 先输出假设和检查顺序，而不是直接改。','调试要先判断，再执行。','获得一份有顺序的修复假设。','至少输出一个修复假设和对应检查顺序。','你已经开始用更系统的方式调试 CLI 问题。',12,15,'["修复假设","检查顺序"]','["先形成检查顺序，再执行修改。"]','[{"text":"一上来就修改代码，容易让问题更难定位。","isTrap":true}]',1),
    ('92000000-2222-2222-2222-000000000004'::uuid,4,'完成一次修复与复测','根据假设完成修复，并再次运行确认问题真正消失。','没有复测的修复不算完成。','完成一次修复和复测闭环。','至少完成一次修复并验证结果收敛。','你已经跑通命令行调试的完整闭环。',12,15,'["修复执行","复测闭环"]','["修复后一定要再次验证。"]','[{"text":"只看 AI 解释不复测，会产生大量假修复。","isTrap":true}]',1),
    ('92000000-2222-2222-2222-000000000005'::uuid,5,'沉淀你的 CLI 调试清单','总结对 Codex CLI 有效的调试顺序与检查动作。','调试能力来自可复用的检查清单。','输出一份 Codex CLI 调试清单。','至少记录 3 条后续会重复使用的调试动作。','你已经形成基本的 CLI 调试方法。',8,20,'["调试清单","经验沉淀"]','["沉淀清单，能显著减少下次排查时间。"]','[{"text":"每次都从头摸索，会让调试效率始终上不来。","isTrap":true}]',2)
) AS data(
  step_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight
)
CROSS JOIN path
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
  difficulty_weight = EXCLUDED.difficulty_weight,
  updated_at = NOW();

WITH path AS (
  SELECT id AS path_id FROM public.learning_paths WHERE code = 'path-codex-intermediate-feature-shipping'
)
INSERT INTO public.path_steps (
  id, path_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight,
  is_required, metadata, created_at, updated_at
)
SELECT
  data.step_id, path.path_id, data.step_no, data.title, data.summary, data.focus, data.goal,
  data.completion_criteria, data.review_summary, data.estimated_minutes, data.reward_score,
  data.knowledge_points::jsonb, data.key_points::jsonb, data.pitfalls::jsonb, data.difficulty_weight,
  true, '{}'::jsonb, NOW(), NOW()
FROM (
  VALUES
    ('92000000-2222-2222-3333-000000000001'::uuid,1,'定义一个可交付功能切片','把需求收窄成 Codex CLI 能稳定推进的一小块功能。','命令行交付尤其依赖功能边界清晰。','定义一个可独立完成的功能切片。','至少明确输入、输出、边界和验收方式。','你已经建立这次交付的边界。',8,10,'["功能切片","交付边界"]','["切片清楚，交付才会稳定。"]','[{"text":"没有边界的需求很难在 CLI 中高效推进。","isTrap":true}]',1),
    ('92000000-2222-2222-3333-000000000002'::uuid,2,'写出实现顺序与风险','让 Codex CLI 先帮你排出实现顺序、潜在风险和验证办法。','计划越清楚，执行越稳。','产出一份可执行实现顺序。','至少列出实现顺序、一个风险和一项验证动作。','你已经从“直接写”切换到“先组织后实现”。',10,10,'["实现顺序","风险前置"]','["先排顺序，再开始改。"]','[{"text":"没有顺序的实现，后续返工概率很高。","isTrap":true}]',1),
    ('92000000-2222-2222-3333-000000000003'::uuid,3,'完成首轮功能实现','围绕计划完成第一版可运行结果，不要求一步到位。','先有可运行结果，再继续收敛。','完成第一版功能实现。','功能主体可以运行，且主要目标已基本达成。','你已经把计划推进成第一版结果。',12,15,'["首轮实现","可运行版本"]','["先做出第一版，再补细节。"]','[{"text":"一开始就追求完美，会拖慢整个功能推进。","isTrap":true}]',1),
    ('92000000-2222-2222-3333-000000000004'::uuid,4,'补齐验证与边界情况','让 Codex CLI 帮你补齐遗漏的边界情况、提示文案和异常分支。','交付质量在边界里体现。','补齐一轮边界与异常情况。','至少修正 1-2 个此前未覆盖的边界或异常。','你已经开始从“能跑”走向“能交付”。',12,15,'["边界补齐","异常处理"]','["边界补齐常常决定最终交付质量。"]','[{"text":"只测主流程，会让交付后问题集中暴露。","isTrap":true}]',1),
    ('92000000-2222-2222-3333-000000000005'::uuid,5,'联调检查并验收','对照目标完成联调与验收，确认功能真的达到预期。','没有验收动作，交付状态就不明确。','完成一次最小联调与验收闭环。','能对照验收口径确认功能是否真正完成。','你已经完成一轮真实的 Codex CLI 功能交付。',10,20,'["联调","验收闭环"]','["按验收标准判断完成，而不是按感觉。"]','[{"text":"没有明确验收动作时，功能常会停留在半完成状态。","isTrap":true}]',1),
    ('92000000-2222-2222-3333-000000000006'::uuid,6,'沉淀 Codex CLI 交付方法','总结自己在 Codex CLI 中有效的切片、计划、实现和验收动作。','沉淀下来后，后续交付效率会持续提高。','输出一份 Codex CLI 交付流程总结。','至少整理出 3 条可复用的交付准则。','你已经形成 Codex CLI 的最小交付方法。',8,20,'["方法沉淀","交付复盘"]','["方法复盘能把一次成功变成持续成功。"]','[{"text":"不沉淀方法时，下次交付仍会重复试错。","isTrap":true}]',2)
) AS data(
  step_id, step_no, title, summary, focus, goal, completion_criteria, review_summary,
  estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, difficulty_weight
)
CROSS JOIN path
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
  difficulty_weight = EXCLUDED.difficulty_weight,
  updated_at = NOW();

COMMIT;
