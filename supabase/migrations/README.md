# Supabase Migrations

## Purpose

This folder captures the SQL needed to bring the MVP Postgres schema live inside the Aliyun Supabase project.

## How to apply

1. Prefer the repo helper command: `pnpm db:run:file -- <sql-file>`.
2. Execute each migration file in sequence, starting with `supabase/migrations/001_init.sql`.
3. For an existing project that has already run `001_init.sql`, execute only the next unapplied file, such as `002_fix_update_updated_at_search_path.sql`.
4. If you need manual execution, you can also open the Supabase dashboard and run the same SQL in **SQL Editor**.
5. Confirm no errors appear and then refresh `Table Editor` or rerun Security Advisor to verify the change.

Repeat the same steps for later migrations, keeping a new sequential file under this directory and updating this README if the workflow changes.

## Current sequence

As of the current MVP snapshot, the migration sequence now continues through:

1. `001_init.sql`
2. `002_fix_update_updated_at_search_path.sql`
3. `003_promote_profile_contact_fields.sql`
4. `004_add_profile_auth_tracking_fields.sql`
5. `005_create_user_profile_export_view.sql`
6. `006_expand_user_profile_export_view_metrics.sql`
7. `007_create_profile_avatar_bucket.sql`
8. `008_add_feedback_tickets.sql`
9. `009_add_interrupted_learning_path_status.sql`
10. `010_create_growth_write_models.sql`
11. `011_create_daily_checkins.sql`
12. `012_create_ai_conversation_core.sql`
13. `013_create_ai_provider_registry.sql`
14. `014_create_ai_agent_registry.sql`
15. `015_create_ai_skill_registry.sql`
16. `016_create_llm_invocations.sql`
17. `017_create_admin_accounts.sql`
18. `018_create_learning_material_plan_tables.sql`
