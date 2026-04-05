# Repository Guidelines

## Project Structure & Module Organization

This repository is no longer documentation-only. It contains a runnable Next.js App Router app for the AI coding tutor product, with frontend pages, `app/api` route handlers, `server/modules` services, Supabase migrations, and the planning docs in `docs/plans/`.

If you need a fast orientation to the project and its current authoritative documents, start with `docs/plans/README.md`.

- `app/`: route entries such as `/`, `/login`, `/onboarding`, `/learn`, `/map`, `/achievements`, `/history`, `/admin`, `/admin/users`, `/admin/feedback`, `/admin/learning`, `/admin/settings`, …
- `app/api/`: current BFF/API route handlers
- `features/`: feature-level pages, components, static view data, and view models
- `components/`: shared layout and UI primitives
- `lib/api/`: API contracts and client wrappers
- `lib/supabase/`: browser/server Supabase clients and storage helpers
- `server/modules/`: current domain services such as auth, onboarding, learning, learning-materials, learning-plans, progress, achievement, history, feedback, admin-auth, admin-dashboard, admin-users, admin-feedback, admin-learning, admin-settings, …
- `supabase/migrations/`: checked-in database migrations
- `constants/`, `types/`, `providers/`, `public/`: shared frontend support code and assets
- `scripts/`: lightweight verification scripts for key demo pages and layout rules
- `docs/plans/`: dated planning artifacts; keep using `YYYY-MM-DD-topic-name.md`

Current implemented backend/data pieces include auth login flow integration, homepage session-summary redirecting, profile read/update, avatar upload, onboarding APIs, current learning/progress/history/achievement read models, task completion and task status write APIs, daily check-in APIs, score ledger and rank snapshot write models, history plan detail and status actions, feedback APIs, admin console Phase 1 (auth, dashboard, feedback tickets), **admin user operations** (`GET/PATCH /api/admin/users`, export, detail, soft-delete, restore), **admin learning operations** (`GET /api/admin/learning-paths`, export, detail, `POST /status` for `reactivate/archive`), **admin settings governance operations** (`GET /api/admin/settings/overview`, admin account list, enable/disable, audit-log list), self-directed tutorial link plan generation (`/api/learning/plan-from-material` and plan draft confirm/regenerate), and checked-in Supabase migrations through `018`. Still-planned items include analytics ingestion, admin Phase 2 **remainder** (AI ops, finer-grained permissions, and deeper user-domain ops such as internal notes / manual score adjustment), later AI orchestration phases (e.g. prompt versioning and ops UI), and subscription/payment.

## Build, Test, and Development Commands

Use `pnpm` for local work in this repository.

- `pnpm dev`: start the Next.js development server
- `pnpm build`: produce a production build
- `pnpm lint`: run the frontend lint checks
- `pnpm test:map-page`
- `pnpm test:achievements-page`
- `pnpm test:workspace-sidebar`
- `pnpm test:settings-logout`
- `pnpm test:workspace-layout-widths`
- `pnpm test:workspace-aside-styles`
- `pnpm test:learning-plan-from-material`
- `pnpm test:admin-learning`
- `pnpm test:admin-settings`

For documentation-only changes, continue using lightweight checks such as `rg --files docs/plans` and `sed -n '1,80p' docs/plans/<file>.md`.

## Coding Style & Naming Conventions

Write frontend code in TypeScript with React and Next.js conventions. Follow the existing alias style such as `@/features/...` and keep component, feature, and constant names consistent with the current structure. Prefer small, composable components and keep static display data close to the relevant feature when it is intentionally not backed by an API yet.

Write Markdown with short sections, clear headings, and direct language. Existing product and planning documents are written primarily in Chinese with English product and stack terms; keep that terminology consistent. Use lowercase kebab-case for filenames after the date prefix in `docs/plans/`.

## Testing Guidelines

There is no full end-to-end or backend test suite in the current snapshot. The main verification surface is:

- `pnpm lint`
- targeted `scripts/check-*.mjs` assertions for important UI structure and copy regressions
- manual review of real API-backed user flows plus remaining static-display flows

When changing a page or shared layout, run the relevant page check script plus any broader lint/build command needed to support your claim. If you add real backend or database code, add the matching automated tests and document the exact command in the same change.

## Commit & Pull Request Guidelines

This workspace includes `.git`. Use Conventional Commits, for example `feat: add onboarding flow shell` or `docs: update backend status in agents guide`.

Keep each pull request scoped to one frontend slice, one documentation update, or one implementation concern. Include:

- a short summary of the change
- affected routes or directories
- verification commands actually run
- screenshots for UI changes when they help reviewers

## Contributor Notes

Prefer updating an existing plan doc before creating a duplicate. When assumptions change, update the PRD or architecture doc first, then align downstream files such as the API spec, schema design, or task list.

For quick project understanding, read `docs/plans/README.md` first, then follow its recommended reading order.

Do not describe planned backend or database capabilities as already implemented. Today the repository reflects a partially implemented full-stack MVP: several user-facing flows already use real `app/api` + Supabase, including auth, homepage redirect recovery, onboarding, learning/progress/history read models, history plan management, profile/avatar, feedback, the main learning message AI path, Phase A self-directed material plan APIs, and admin operations for **users**, **learning paths**, and **system settings governance** (overview/admin-account list & enable-disable/audit log list), while analytics ingestion, admin Phase 2 **remainder** (AI ops, finer-grained permissions, internal notes/manual score adjustment), later orchestration ops, and subscription/payment remain planned or partial.
