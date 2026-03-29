BEGIN;

-- learning_tools seed
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
    '11111111-1111-1111-1111-111111111111'::uuid,
    'cursor',
    'Cursor',
    'gui',
    'beginner',
    true,
    10,
    '{"summary":"对话式写代码，上手快，适合新手建立习惯","category":"图形化 IDE","color":"brand","popular":true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'trae',
    'Trae',
    'gui',
    'beginner',
    true,
    20,
    '{"summary":"界面与提示对中文友好，上手阻力小","category":"图形化 IDE","color":"brand","popular":true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'windsurf',
    'Windsurf',
    'gui',
    'intermediate',
    true,
    30,
    '{"summary":"多步 Agent 能力强，适合练「交代清楚再改」的协作","category":"图形化 IDE","color":"chart-5","popular":false}'::jsonb,
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

-- learning_paths seed
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
  '44444444-4444-4444-4444-444444444444'::uuid,
  lt.id,
  'cursor-quickstart',
  'Cursor 零基础起步营',
  'beginner',
  'preset_training',
  1,
  true,
  true,
  'cursor-buddy',
  6,
  '从第一次 AI 对话到第一个迷你项目，搭好 Cursor 入门最小闭环。',
  '{
    "summary":"从第一次 AI 对话到第一个迷你项目，搭好 Cursor 入门最小闭环。",
    "recommended":true,
    "currentLevelFit":"适合第一次系统使用 Cursor 的新用户",
    "coachAgentLabel":"入门陪练",
    "estimatedDuration":"3-5 天",
    "tags":["界面熟悉","Prompt 入门","小作品"],
    "preview":["认识 Cursor 工作区","写出第一个 Prompt","完成第一个页面练习"]
  }'::jsonb,
  NOW(),
  NOW()
FROM public.learning_tools lt
WHERE lt.code = 'cursor'
ON CONFLICT (code) DO UPDATE
SET
  tool_id = EXCLUDED.tool_id,
  name = EXCLUDED.name,
  target_level = EXCLUDED.target_level,
  agent_code = EXCLUDED.agent_code,
  stage_count = EXCLUDED.stage_count,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- self-directed learning_paths seed
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
      '55555555-1111-1111-1111-111111111111'::uuid,
      'cursor',
      'path-cursor-beginner-self-study',
      'Cursor 自主学习模式',
      'beginner',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Cursor」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Cursor」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    ),
    (
      '55555555-2222-2222-2222-222222222222'::uuid,
      'trae',
      'path-trae-beginner-self-study',
      'Trae 自主学习模式',
      'beginner',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Trae」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Trae」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
    ),
    (
      '55555555-3333-3333-3333-333333333333'::uuid,
      'windsurf',
      'path-windsurf-intermediate-self-study',
      'Windsurf 自主学习模式',
      'intermediate',
      '把你手头的教程、代码、链接或截图贴进来，我们会结合「Windsurf」和你的基础，拆成一步步能练的小任务。',
      '{"summary":"把你手头的教程、代码、链接或截图贴进来，我们会结合「Windsurf」和你的基础，拆成一步步能练的小任务。","preview":["粘贴或上传材料","先拿到「这一步做什么」","卡住时接着问"]}'
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

-- path_steps seed for cursor-quickstart
WITH path AS (
  SELECT id AS path_id
  FROM public.learning_paths
  WHERE code = 'cursor-quickstart'
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
  data.step_id,
  path.path_id,
  data.step_no,
  data.title,
  data.summary,
  data.focus,
  data.goal,
  data.completion,
  data.review,
  data.estimated_minutes,
  data.xp,
  '[]'::jsonb,
  data.key_points::jsonb,
  data.pitfalls::jsonb,
  data.difficulty,
  true,
  '{}'::jsonb,
  NOW(),
  NOW()
FROM (
  VALUES
    (
      'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
      1,
      '安装与配置 Cursor',
      '完成安装、登录和基础配置，让 AI 能正常工作。',
      '先把环境准备好，后面的每一关才有真实练习价值。',
      '安装 Cursor 并确认 AI 功能可以正常使用。',
      '完成安装、登录账号，并能成功打开一个项目目录。',
      '你已经完成安装与登录配置，后续可以直接进入第一次 AI 协作。',
      5,
      10,
      '["先确保 Cursor 可以打开本地项目，再进入学习流程。","登录成功后再验证 AI 功能是否可用，避免后续排查偏题。"]',
      '[{"text":"首次打开项目时如索引较慢，先等待完成，不要频繁重启。","isTrap":true},{"text":"AI 功能无响应时，优先检查登录状态和网络代理设置。"}]',
      1
    ),
    (
      'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
      2,
      '完成第一次 AI 对话',
      '用 Ask 面板完成第一次提问，建立最小协作心智。',
      '先体验一次最简单的提问，不要一开始就追求复杂结果。',
      '打开 Ask 面板，完成一次关于当前项目的有效提问。',
      '成功发出一次提问，并理解 Ask 更适合解释与追问。',
      '你已经建立了第一次 AI 协作体验，知道 Ask 适合用来提问和理解概念。',
      6,
      10,
      '["Ask 更适合解释概念、追问细节和理解代码。","问题越具体，AI 的回答越容易转化成行动。"]',
      '[{"text":"不要一上来发一大段模糊需求，先问一个最小问题。","isTrap":true},{"text":"遇到不理解的回答时，继续追问比换一个新问题更有效。"}]',
      1
    ),
    (
      'aaaaaaaa-0000-0000-0000-000000000003'::uuid,
      3,
      '理解 Ask 与 Agent 的区别',
      '先做一个最小实验，判断 Agent 何时比 Ask 更适合。',
      '只做一个最小实验：让 Agent 生成一个 React 时钟组件，理解它和 Ask 的职责边界。',
      '用 Cursor 的 Agent 功能创建一个 React 时钟组件。',
      '看到一个可运行的时钟组件，并理解为什么这是 Agent 场景。',
      '你已经验证了 Ask 与 Agent 的分工差异，下一步可以进入调试协作。',
      8,
      10,
      '["Ask 更适合解释概念、追问细节。","Agent 更适合生成完整文件或连续修改多段代码。"]',
      '[{"text":"最常见的卡点：明明想生成文件，却还在 Ask 里反复追问。","isTrap":true},{"text":"如果 Agent 结果不理想，先缩小任务范围再继续，而不是一次加很多要求。","isTrap":true}]',
      1
    ),
    (
      'aaaaaaaa-0000-0000-0000-000000000004'::uuid,
      4,
      'AI 调试助手',
      '学会带着错误上下文让 Cursor 帮你定位并修复 bug。',
      '不是让 AI 猜答案，而是提供足够上下文，让它和你一起定位问题。',
      '用报错信息和相关代码，让 Cursor 帮你完成一次有效调试。',
      '提供错误信息与上下文后，完成一次定位和修复闭环。',
      '你已经完成了一次 AI 调试闭环，能更有效地描述问题上下文。',
      10,
      15,
      '["调试时要给 AI 足够上下文。","验证修复结果和拿到修复建议同样重要。"]',
      '[{"text":"只贴报错文本，不贴相关代码，是最常见的低效提问方式。","isTrap":true},{"text":"拿到修复建议后必须再次运行验证，不能只看文字解释。","isTrap":true}]',
      1
    ),
    (
      'aaaaaaaa-0000-0000-0000-000000000005'::uuid,
      5,
      '多文件上下文',
      '让 Cursor 理解项目结构，而不是只盯着单一代码片段。',
      '学会给 AI 足够但不过量的上下文，让它理解真实项目而不是局部片段。',
      '通过引用多个文件，让 AI 理解一个小项目的结构并协助修改。',
      '完成一次跨文件上下文协作，并理解何时需要扩大上下文。',
      '你已经掌握了多文件上下文协作，能更稳地处理真实项目。',
      12,
      20,
      '["上下文越精准，AI 的输出越稳定。","扩大上下文不是越多越好，而是越相关越好。"]',
      '[{"text":"一次塞入过多无关文件会稀释重点，让回答变散。","isTrap":true},{"text":"没有先解释项目结构时，AI 更容易误判文件职责。","isTrap":true}]',
      1
    ),
    (
      'aaaaaaaa-0000-0000-0000-000000000006'::uuid,
      6,
      '完成第一个迷你项目',
      '把前面的提问、生成、调试和上下文能力串成一次完整实战。',
      '通过一个最小项目把前几关串起来，形成可复用的协作节奏。',
      '和 Cursor 一起完成一个最小但完整的迷你项目交付。',
      '完成从需求、生成、调试到收尾的一个完整协作闭环。',
      '你已经完成了首个完整实战，具备继续扩展到真实项目的基础。',
      30,
      30,
      '["完整交付比零散尝试更能形成可迁移的方法。","需求拆小、逐步验证、及时复盘，是稳定协作的基础。"]',
      '[{"text":"项目目标太模糊会导致 AI 反复重做，先收窄范围再开始。","isTrap":true},{"text":"实战中遇到问题是正常现象，关键是维持推进节奏。","isTrap":true}]',
      2
    )
) AS data(
  step_id,
  step_no,
  title,
  summary,
  focus,
  goal,
  completion,
  review,
  estimated_minutes,
  xp,
  key_points,
  pitfalls,
  difficulty
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
  key_points = EXCLUDED.key_points,
  pitfalls = EXCLUDED.pitfalls,
  difficulty_weight = EXCLUDED.difficulty_weight,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- generic self-directed starter steps
WITH self_paths AS (
  SELECT id, code, name
  FROM public.learning_paths
  WHERE source_type = 'self_directed'
    AND code IN (
      'path-cursor-beginner-self-study',
      'path-trae-beginner-self-study',
      'path-windsurf-intermediate-self-study'
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
