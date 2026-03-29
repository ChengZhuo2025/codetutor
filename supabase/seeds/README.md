# Supabase Seeds

## Purpose

This folder holds the idempotent SQL scripts that populate the MVP dictionary tables (`learning_tools`, `learning_paths`, `path_steps`) and a reference developer record that exercises the main `/learn`, `/progress`, and `/history` flows.

## Execution order

1. `supabase/seeds/001_dictionary.sql` – run once (or whenever you refresh the dictionary). It is safe to rerun because each `INSERT` uses `ON CONFLICT` to update the existing rows.
2. `supabase/seeds/002_demo_user.sql` – run after dictionary seeds are live and after you have a Supabase Auth user. **Before running, edit the `dev_user_id` constant in the file to match the real `auth.users.id` value you created through Supabase Auth.**

## Notes

- The dictionary script currently seeds three tools (`Cursor`, `Trae`, `Windsurf`), one detailed preset path for `Cursor`, and self-directed starter templates for the seeded tools.
- The user script inserts `user_profiles`, `user_learning_preferences`, `user_learning_paths`, and `user_tasks`; it assumes the referenced path and tools already exist (hence the execution order).
- Rerun the user script only when you want to reset the demo user’s progress—it updates the same rows via `ON CONFLICT`.
