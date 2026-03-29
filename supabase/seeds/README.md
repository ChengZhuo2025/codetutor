# Supabase Seeds

## Purpose

This folder holds the idempotent SQL scripts that populate the MVP dictionary tables (`learning_tools`, `learning_paths`, `path_steps`) and a reference developer record that exercises the main `/learn`, `/progress`, and `/history` flows.

## Execution order

1. `supabase/seeds/001_dictionary.sql` – run once (or whenever you refresh the dictionary). It is safe to rerun because each `INSERT` uses `ON CONFLICT` to update the existing rows.
2. `supabase/seeds/003_onboarding_tool_expansion.sql` – run after `001_dictionary.sql` when you want the onboarding tool list to match the full 9-tool frontend prototype. It adds the missing CLI / online tools plus a minimal preset path and self-study path for each tool.
3. `supabase/seeds/004_claude_codex_preset_curriculum.sql` – run after `003_onboarding_tool_expansion.sql` when you want `Claude Code` and `Codex CLI` to have fuller platform-learning preset curriculum data instead of only the minimal starter path.
4. `supabase/seeds/002_demo_user.sql` – run after dictionary seeds are live and after you have a Supabase Auth user. **Before running, edit the `dev_user_id` constant in the file to match the real `auth.users.id` value you created through Supabase Auth.**

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
- The user script inserts `user_profiles`, `user_learning_preferences`, `user_learning_paths`, and `user_tasks`; it assumes the referenced path and tools already exist (hence the execution order).
- Rerun the user script only when you want to reset the demo user’s progress—it updates the same rows via `ON CONFLICT`.
