# Repository Guidelines

## Project Structure & Module Organization

This repository is no longer documentation-only. It contains a runnable Next.js App Router app for the AI coding tutor product, with frontend pages, `app/api` route handlers, `server/modules` services, Supabase migrations, and the planning docs in `docs/plans/`.

If you need a fast orientation to the project and its current authoritative documents, start with `docs/plans/README.md`.

- `app/`: route entries such as `/`, `/login`, `/onboarding`, `/learn`, `/map`, `/achievements`, `/history`, `/changelog`, `/admin`, `/admin/users`, `/admin/feedback`, `/admin/learning`, `/admin/ai`, `/admin/site`, `/admin/settings`, …
- `app/api/`: current BFF/API route handlers
- `features/`: feature-level pages, components, static view data, and view models
- `components/`: shared layout and UI primitives
- `lib/api/`: API contracts and client wrappers
- `lib/supabase/`: browser/server Supabase clients and storage helpers
- `server/modules/`: current domain services such as auth, onboarding, learning, learning-materials, learning-plans, progress, achievement, history, feedback, admin-auth, admin-dashboard, admin-users, admin-feedback, admin-learning, admin-ai, admin-site, admin-settings, …
- `supabase/migrations/`: checked-in database migrations
- `constants/`, `types/`, `providers/`, `public/`: shared frontend support code and assets
- `scripts/`: lightweight verification scripts for key demo pages and layout rules
- `docs/plans/`: dated planning artifacts; keep using `YYYY-MM-DD-topic-name.md`

Implemented backend/data pieces by domain:

**Auth & Identity**
- Phone-primary account auth with WeChat/Douyin Supabase identity linking
- Homepage session-summary redirect, async post-login IP city backfill

**User**
- Profile read/update, avatar upload
- Light/dark theme (`next-themes`, default dark, `localStorage` key `codetutor-theme`; no REST API)

**Onboarding & Learning**
- Onboarding APIs
- Learning/progress/history/achievement read models
- Task completion and task status write APIs
- Daily check-in APIs, score ledger and rank snapshot write models
- History plan detail and status actions (`interrupted`/`abandoned` 计划重新激活与冲突阻断)
- Learning chat multimodal attachments (`POST /api/learning/attachments`, private Storage-backed image/voice)
- AI reply text-to-speech playback (Aliyun Qwen HTTP, MiniMax, SiliconFlow/OpenAI-compatible TTS)
- Self-directed tutorial link async material planning (multimodal evidence extraction, quality gate, transactional draft confirmation)

**Workspace UI**
- Desktop shell collapse/expand (shared `/learn`, `/map`, `/achievements`, `/history`, `/orders`; `localStorage` persistence)

**Analytics & Notifications**
- Analytics event ingestion (`POST /api/analytics/event`)
- Notification settings + in-app reminders (`GET/PATCH /api/notifications/settings`, read/dismiss)

**Feedback**
- Feedback APIs (user submission + admin ticket management)

**Admin — Dashboard**
- Admin session lookup RPC, cache prewarm, dashboard metrics

**Admin — Users**
- User list/filter/export, detail aggregation, soft-delete/restore

**Admin — Learning**
- Learning path list/detail, recent sessions, reactivate/archive status ops
- Self-directed learning path template CRUD, AI draft generation, unstarted-path sync

**Admin — AI**
- Provider/Model/Agent management, ASR/TTS model categories, connection tests
- Multimedia management (`/admin/ai/media/transcription-settings`, `/admin/ai/media/attachments`)
- Provider API Key encrypted DB storage + admin management with masked display

**Admin — Site**
- Site information, help center, changelog management
- Logo/name/tagline/Slogan/SEO/filing/copyright/version, about/terms/privacy Markdown
- Changelog draft generation via `deepseek-v4-pro`, review/publish/edit/delete, public `/changelog`

**Admin — Notifications**
- Message center (`/admin/notifications`, feed/learning/AI/system event sources)

**Admin — Finance**
- WeChat Native + Alipay scan payment configuration
- Order list/detail/status sync, finance stats
- Subscription entitlement activation, 7-day free plan expiry
- Encrypted payment credentials, idempotent entitlement activation

**Admin — Settings**
- Admin accounts, roles, governance operations
- Phase-1 runtime hardening (auth cache, AI config cache, rate limiting)

**Infrastructure**
- Supabase migrations through `057`
- OpenAPI 3.1 docs at `/api-docs`

Still planned or partial: finer-grained permissions, internal notes/manual score adjustment, AI orchestration (prompt versioning/rollout/cost-stability ops), Redis/shared queue, refunds/auto-renewal, JSAPI/H5 payments, finance export/invoices, deeper reconciliation.

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
- `pnpm test:workspace-shell-collapse`
- `pnpm test:learning-plan-from-material`
- `pnpm test:admin-users`
- `pnpm test:admin-learning`
- `pnpm test:admin-learning-templates`
- `pnpm test:admin-ai`
- `pnpm test:admin-site`
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

When changing a page or shared layout, pair the route with the closest `scripts/check-*.mjs` assertion. If you add real backend or database code, add the matching automated tests where the current harness can support them.

## Commit & Pull Request Guidelines

This workspace includes `.git`. Use Conventional Commits, for example `feat: add onboarding flow shell` or `docs: update backend status in agents guide`.

Keep each pull request scoped to one frontend slice, one documentation update, or one implementation concern. Include:

- a short summary of the change
- affected routes or directories
- screenshots for UI changes when they help reviewers

## Contributor Notes

Prefer updating an existing plan doc before creating a duplicate. When assumptions change, update the PRD or architecture doc first, then align downstream files such as the API spec, schema design, or task list.

For quick project understanding, read `docs/plans/README.md` first, then follow its recommended reading order.

When code changes affect real behavior, do a documentation sync pass before closing the task. Minimum checklist:

- If routes / request bodies / response bodies changed, update the matching persistent docs plus `server/modules/api-docs/openapi.ts` and `server/modules/api-docs/schemas.ts`.
- If migrations / schema / env vars changed, update `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`, `.env.example`, `docs/plans/README.md`, and any relevant architecture/design doc.
- If admin AI / provider behavior changed, re-check `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md` and `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`.
- If the change affects current project status or implemented capability summaries, update `AGENTS.md` and `docs/plans/README.md`.

Do not describe planned backend or database capabilities as already implemented. Today the repository reflects a partially implemented full-stack MVP.

**User-facing flows already using real API + Supabase:**
- Phone-primary auth with WeChat/Douyin identity linking, homepage redirect recovery
- Onboarding, learning/progress/history read models, history plan management
- Profile/avatar, feedback, analytics ingestion
- Notification settings + in-app reminders, user order management
- Public `/changelog` page
- Main learning message AI path with image/voice attachments
- Staged async self-directed material plan APIs (multimodal evidence extraction + quality gate)

**Admin operations:**
- User management, learning paths and self-directed templates
- AI operations (provider/model/agent management)
- System settings governance
- Site information, help center, changelog
- Finance operations (order management, finance stats)
- WeChat Native / Alipay scan payment + subscription entitlement activation

**Remaining planned or partial:**
- Finer-grained permissions, internal notes/manual score adjustment
- Deeper AI orchestration ops (prompt versioning/rollout)
- Refunds, auto-renewal, JSAPI/H5 payment variants
- Finance export, invoices, deeper reconciliation
