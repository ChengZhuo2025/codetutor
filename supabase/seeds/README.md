# Supabase Seeds

## Purpose

This folder holds the idempotent SQL scripts that populate the MVP dictionary tables (`learning_tools`, `learning_paths`, `path_steps`), demo user data, AI registry bootstrap data, and the planner agent used by the self-directed material-plan flow.

## Default execution order

1. `supabase/seeds/001_dictionary.sql` – run once (or whenever you refresh the dictionary). It is safe to rerun because each `INSERT` uses `ON CONFLICT` to update the existing rows.
2. `supabase/seeds/003_onboarding_tool_expansion.sql` – run after `001_dictionary.sql` when you want the onboarding tool list to match the full 9-tool frontend prototype. It adds the missing CLI / online tools plus a minimal preset path and self-study path for each tool.
3. `supabase/seeds/004_claude_codex_preset_curriculum.sql` – run after `003_onboarding_tool_expansion.sql` when you want `Claude Code` and `Codex CLI` to have fuller platform-learning preset curriculum data instead of only the minimal starter path.
4. `supabase/seeds/002_demo_user.sql` – run after dictionary seeds are live and after you have a Supabase Auth user. **Before running, edit the `dev_user_id` constant in the file to match the real `auth.users.id` value you created through Supabase Auth.**
5. `supabase/seeds/005_ai_provider_and_model_registry.sql` – run after `012-016` AI migrations and `028_add_ai_model_profile_fields.sql` are applied. It seeds the first SiliconFlow provider row plus the phase-1 model registry (`deepseek-v3-2`, `glm-5`, `deepseek-r1`) with structured model profile fields.
6. `supabase/seeds/006_ai_agent_and_binding_registry.sql` – run after `005_ai_provider_and_model_registry.sql`. It seeds the first batch of teaching agents, helper agents, and path / tool-level binding rules.
7. `supabase/seeds/007_ai_skill_registry.sql` – run after `006_ai_agent_and_binding_registry.sql`. It seeds the first batch of built-in skill packs plus agent-to-skill bindings. Make sure the local `ai/skills/` directory exists and stays aligned with the seeded paths.
8. `supabase/seeds/008_material_plan_planner_agent.sql` – run after `018_create_learning_material_plan_tables.sql` and after the AI provider/model registry is ready. It seeds `agent_templates.code = self-study-material-planner`, which is required by `POST /api/learning/plan-from-material` and the plan draft regenerate/confirm flow.

Recommended execution command:

- `pnpm db:run:file -- <sql-file>`

## Optional manual seeds

- `supabase/seeds/001_create_admin_seeds.sql` is not part of the default bootstrap chain. Run it only after `017_create_admin_accounts.sql` is applied and after you have manually created a real Supabase Auth admin user.
- Before running `001_create_admin_seeds.sql`, replace the placeholder `v_test_user_id` in the file with the real `auth.users.id`. Otherwise the insert will fail or point at a non-existent test user.
- After the admin seed is applied, you may later change the admin display name, email, or password through normal admin/Auth operations. When verifying whether equivalent seed data already exists, do not rely on the default display name `测试管理员`; instead, check whether `public.admin_accounts` contains a valid admin row and whether it is bound to `super_admin` in `public.admin_account_roles`.

## 改种子数据还是写迁移？

| 场景 | 建议 |
|------|------|
| **本地 / 全新环境**：用 `supabase db reset` 或按顺序重跑 seeds 刷新字典与演示数据 | **直接改本目录已有 `*.sql` seed 文件**。各文件已用 `ON CONFLICT … DO UPDATE`，重跑会覆盖同名键上的文案与 `metadata`。 |
| **线上已有数据、不能整库重置**：只更新某几张表里的展示文案 | **新增一条 `supabase/migrations/` 迁移**，写 `UPDATE … SET metadata = … WHERE code = …`，便于审计与按环境执行。 |

文案类、字典类数据以 **seed 为内容源** 时，仓库内以 seed 与前端 `onboarding-data` / 服务端拼装逻辑保持一致为准；上线后再改历史行请用迁移补一刀，避免只靠「再执行一遍 seed」漏掉已存在库。

## Notes

- `001_dictionary.sql` keeps the original MVP base dictionary: three GUI tools (`Cursor`, `Trae`, `Windsurf`), one detailed preset path for `Cursor`, and self-directed starter templates for those seeded tools.
- `003_onboarding_tool_expansion.sql` is an additive expansion seed for the remaining six tools in the current onboarding prototype: `Claude Code`, `Codex CLI`, `OpenCode`, `Google Stitch`, `Bolt.new`, `Lovable`.
- The expansion seed also inserts a minimal preset-training path and a minimal self-directed path for each of those six tools, so onboarding can complete and `/learn` can open successfully after selection.
- `004_claude_codex_preset_curriculum.sql` upgrades the preset-training catalog for the two current core CLI tools, `Claude Code` and `Codex CLI`, to include `workflow-boost`, `debug-lab`, and `feature-shipping` curriculum paths with richer step data.
- `005_ai_provider_and_model_registry.sql` seeds the first AI provider registry used by the planned learning orchestration backend. `deepseek-r1` is intentionally marked for manual test use only and should not become the default production route; model category / runtime capability / connection-test settings now live in structured columns instead of being hidden in `metadata`.
- `006_ai_agent_and_binding_registry.sql` seeds the first batch of agent templates and routing bindings for current seeded paths and tools. It intentionally does not seed skill packs yet; those will follow once the local `ai/skills` directory structure is created.
- `007_ai_skill_registry.sql` seeds the first batch of built-in skill packs and agent skill bindings. The database paths in that seed point to the checked-in `ai/skills/` directory in this repository.
- `008_material_plan_planner_agent.sql` seeds the dedicated planner agent for the current self-directed material-plan flow. If it is missing, the planner runtime will fail with `planner agent self-study-material-planner not configured`.
- `001_create_admin_seeds.sql` is a manual helper script for a test admin account. It intentionally is not safe to run blindly because it depends on a real Auth user ID outside the repository.
- For admin seed verification, the authoritative check is whether the remote database already has usable `admin_accounts` data plus the expected role binding, not whether the original seed nickname is unchanged.
- The user script inserts `user_profiles`, `user_learning_preferences`, `user_learning_paths`, and `user_tasks`; it assumes the referenced path and tools already exist (hence the execution order).
- Rerun the user script only when you want to reset the demo user’s progress—it updates the same rows via `ON CONFLICT`.
