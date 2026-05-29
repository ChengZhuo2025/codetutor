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

Current implemented backend/data pieces include auth login flow integration with phone-primary accounts plus WeChat/Douyin Supabase identity linking, homepage session-summary redirecting, async post-login IP city backfill, profile read/update, avatar upload, onboarding APIs, current learning/progress/history/achievement read models, task completion and task status write APIs, daily check-in APIs, score ledger and rank snapshot write models, history plan detail and status actions（包括 `interrupted` / `abandoned` 计划重新激活与冲突阻断）, **user-facing light/dark theme** (`next-themes`, default dark, browser `localStorage` key `codetutor-theme`; no REST API), **workspace desktop shell collapse/expand** (shared `/learn`、`/map`、`/achievements`、`/history`、`/orders` left mini rail + right contextual panel collapse state, browser `localStorage` persistence; no REST API), **analytics event ingestion** (`POST /api/analytics/event` + `event_logs` + basic aggregate service), **notification settings persistence + in-app reminders** (`GET/PATCH /api/notifications/settings`, `GET /api/notifications/in-app`, read/dismiss, workspace sidebar reminder card), feedback APIs, admin console Phase 1 (auth with admin session lookup RPC/cache prewarm, dashboard, feedback tickets, profile/avatar, password change, and current-admin Supabase Auth login email update), **user operations**, **learning operations** including `/admin/learning/templates` self-directed learning path template CRUD, AI draft generation and unstarted-path sync, **admin AI operations** with **structured model profile management** including ASR/TTS model categories and connection tests, and **multimedia management** (`/admin/ai/media/transcription-settings`, `/admin/ai/media/attachments`), **Provider API Key encrypted database storage + admin management**, **phase-1 runtime hardening**, **admin settings governance operations** including enterprise contact management, subscription plan management, **站点信息管理** (`/admin/site/information`, `/admin/site/articles`, `/admin/site/help`, `/admin/site/changelog`, `/changelog`, `/api/site/public`，支持站点 Logo/名称/副标题/Slogan/SEO/备案/版权/版本号、关于我们/用户协议/隐私政策 Markdown 内容、帮助中心分类图标/FAQ Markdown 内容，以及从本地 Git + `site-changelog-writer`/`deepseek-v4-pro` 生成更新日志草稿、审核发布、已发布内容编辑、删除与公开展示), **管理后台消息中心** (`/admin/notifications` + `GET/POST /api/admin/notifications/*`，并接入反馈、支付、AI、系统与用户运营高价值事件源), and **WeChat Native + Alipay scan payment configuration**, **admin finance operations** (order list, order detail, order status sync, finance stats), self-directed tutorial link async material planning with active intake recovery, DB-claimed generation runs, and transactional draft confirmation with fixed `SECURITY DEFINER` search paths, **learning chat multimodal attachments** (`POST /api/learning/attachments`, `attachmentIds` on `POST /api/learning/message`, private Storage-backed image understanding and voice transcription now resolved from admin multimedia transcription settings), **AI reply text-to-speech playback** (`POST /api/learning/message-speech`, powered by the admin `text_to_speech` multimedia setting and unified HTTP TTS Provider Gateway for Aliyun Qwen HTTP, MiniMax, and SiliconFlow/OpenAI-compatible speech, temporary audio response, pause/resume in `/learn`), **微信 Native / 支付宝扫码支付 + subscription entitlement activation + order management** (`GET /api/subscription/plans`, `GET /api/subscription/me`, 7-day free plan expiry, `POST /api/payment/wechat/native-orders`, `POST /api/payment/alipay/precreate-orders`, user order list/cancel/soft-delete, channel-aware order query/sync, `POST /api/payment/wechat/notify`, `POST /api/payment/alipay/notify`, encrypted DB-stored payment credentials, row-locking idempotent entitlement activation, finance/user payment summary RPCs with fixed `SECURITY DEFINER` search paths), and checked-in Supabase migrations through `057`. Still-planned items include finer-grained permissions, deeper user-domain ops such as internal notes / manual score adjustment, later AI orchestration phases and deeper AI ops capabilities (e.g. prompt versioning / rollout / richer cost-stability ops UI), Redis/shared queue infrastructure, refunds/auto-renewal, JSAPI/H5 payment variants, finance export, invoices, and deeper reconciliation.

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

Do not describe planned backend or database capabilities as already implemented. Today the repository reflects a partially implemented full-stack MVP: several user-facing flows already use real `app/api` + Supabase, including phone-primary auth with WeChat/Douyin identity linking, homepage redirect recovery, onboarding, learning/progress/history read models, history plan management, profile/avatar, feedback, analytics ingestion, notification settings + in-app reminders, user order management, the public `/changelog` page, the main learning message AI path with image/voice attachments, staged async self-directed material plan APIs with multimodal evidence extraction + quality gate, admin operations for **users**, **learning paths and self-directed templates**, **AI operations**, **system settings governance**, **站点信息/帮助中心/更新日志**, and **finance operations**, plus first-stage **微信 Native / 支付宝扫码支付与订阅权益开通**. Remaining planned or partial items are finer-grained permissions, internal notes/manual score adjustment, deeper AI orchestration ops such as prompt versioning/rollout, refunds/auto-renewal, JSAPI/H5 payment variants, finance export, invoices, and deeper reconciliation.
