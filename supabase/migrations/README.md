# Supabase Migrations

## Purpose

This folder captures the SQL needed to bring the MVP Postgres schema live inside the Aliyun Supabase project. The Supabase dashboard (SQL editor) is the current runner for these scripts.

## How to apply

1. Open the Supabase dashboard for your project and navigate to **SQL Editor**.
2. Execute each migration file in sequence, starting with `supabase/migrations/001_init.sql`.
3. For an existing project that has already run `001_init.sql`, execute only the next unapplied file, such as `002_fix_update_updated_at_search_path.sql`.
4. Confirm no errors appear and then refresh `Table Editor` or rerun Security Advisor to verify the change.

Repeat the same steps for later migrations, keeping a new sequential file under this directory and updating this README if the workflow changes.
