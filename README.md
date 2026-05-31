# CodeTutor

[![License: AGPL-3.0-only](https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19.2-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e)

**English** | [简体中文](README.zh-CN.md)

CodeTutor is an AI coding tutor for Chinese-speaking learners. It turns scattered tutorials, videos, code snippets, and learning materials into guided learning paths with AI coaching, progress tracking, feedback loops, achievements, and admin operations.

The repository is a full-stack MVP built with Next.js App Router, Supabase, TypeScript, and an extensible AI provider layer. It includes the learner workspace, admin console, API route handlers, service modules, Supabase migrations, and product/architecture planning documents.

## Why CodeTutor

- **Learning by doing**: convert external tutorials and materials into executable learning plans.
- **AI coaching loop**: stream AI replies, support task progression, and connect learning actions to credits and achievements.
- **Operations-ready MVP**: includes admin views for users, learning paths, AI providers, site content, notifications, finance, feedback, and settings.
- **Self-hostable foundation**: Supabase migrations and Next.js server modules are checked in so contributors can inspect and extend the full stack.
- **Open source with network copyleft**: AGPL-3.0-only keeps modified network services open to their users.

## Current Status

CodeTutor is a partially implemented full-stack MVP, not a polished turnkey distribution yet.

Implemented areas include:

- Phone-first authentication, WeChat/Douyin identity linking, homepage session recovery, onboarding, profile, avatar upload, and feedback.
- Learner workspace with AI learning chat, streaming responses, image/voice attachments, text-to-speech playback, task completion, daily check-in, achievements, history, and orders.
- Self-directed tutorial-link intake with async material planning, multimodal evidence extraction, quality gates, editable drafts, and transactional confirmation.
- Admin console for dashboard, users, learning paths/templates, AI provider/model/agent/media settings, site information, help center, changelog, notifications, system settings, finance, and feedback.
- WeChat Native and Alipay scan payment configuration, subscription entitlement activation, order management, notification settings, analytics ingestion, and OpenAPI documentation.
- Supabase migrations through `057`.

Still planned or partial:

- Finer-grained admin permissions.
- Internal notes, manual score adjustment, refunds, auto-renewal, JSAPI/H5 payment variants, finance export, invoices, and deeper reconciliation.
- Later AI orchestration operations such as prompt versioning, rollout controls, richer cost/stability dashboards, and shared queue infrastructure.

## Tech Stack

| Layer | Technology |
| --- | --- |
| App framework | Next.js 16.2 App Router |
| UI runtime | React 19.2 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 4.2, shadcn/ui-style primitives |
| Data validation | Zod, zod-to-openapi |
| Backend | Next.js route handlers plus `server/modules` services |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| AI layer | Provider/agent/skill abstractions under `ai/` and `server/modules` |
| Package manager | pnpm |
| Node.js | 22.18.0 recommended |

## Repository Layout

```text
app/                     Next.js App Router pages and API routes
app/api/                 BFF/API route handlers
ai/                      AI provider, agent, and skill orchestration helpers
components/              Shared layout and UI primitives
constants/               Cross-feature constants
docs/plans/              PRD, architecture, API, schema, and roadmap documents
features/                Feature pages, components, static data, and view models
hooks/                   Shared React hooks
lib/                     API clients, helpers, and Supabase clients
providers/               React context providers
public/                  Static assets
scripts/                 Targeted verification scripts
server/lib/              Server-side shared utilities
server/modules/          Domain services
supabase/migrations/     Database migrations
types/                   Shared TypeScript types
```

Core conventions:

- `app/` stays thin. Page logic should live under `features/`.
- Components used by one domain belong in `features/<domain>/components`; shared components belong in `components/`.
- API contract changes should be reflected in `server/modules/api-docs/openapi.ts` and `server/modules/api-docs/schemas.ts`.
- Database or environment changes should update migrations, `.env.example`, and the relevant planning docs.

## Quick Start

### Requirements

- Node.js `22.18.0`
- pnpm
- A Supabase project, local or remote

### Install

```bash
pnpm install
cp .env.example .env.local
```

Fill the required Supabase and provider variables in `.env.local`. Do not commit real secrets.

```bash
pnpm dev
```

Open `http://localhost:3000`. The admin console lives under `/admin` and requires an admin account.

### Database

The schema is tracked in `supabase/migrations/` and currently runs through migration `057`.

**Option A: Remote Supabase project (recommended for quick start)**

1. Create a free project at [supabase.com](https://supabase.com)
2. Get your project URL and anon/service-role keys from **Settings > API**
3. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
4. Apply migrations using the Supabase Dashboard SQL editor or the helper script:

   ```bash
   pnpm db:run:file supabase/migrations/001_init.sql
   # Repeat for 002 through 057, or concatenate and apply at once
   ```

5. Verify connectivity:

   ```bash
   pnpm db:check
   ```

**Option B: Local Supabase (via Supabase CLI)**

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Start the local stack:

   ```bash
   supabase init   # first time only
   supabase start
   ```

3. Copy the local project URL and keys from the CLI output to `.env.local`
4. Apply all checked-in migrations:

   ```bash
   # Supabase CLI picks up migrations from supabase/migrations/
   supabase db push
   # Or use the helper scripts with your local DATABASE_* variables:
   pnpm db:check
   ```

A one-command local Supabase bootstrap is not yet part of the public developer experience. Contributions to improve the local setup story are welcome.

## Useful Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test:openapi-document
pnpm test:admin-users
pnpm test:admin-learning
pnpm test:admin-ai
pnpm test:admin-site
pnpm test:admin-settings
pnpm test:payment
pnpm test:workspace-sidebar
pnpm test:workspace-shell-collapse
```

The project also has many targeted scripts under `scripts/`. Prefer the smallest script that covers the area you changed.

## Documentation

Start with:

- [docs/plans/README.md](docs/plans/README.md)
- [Product requirements](docs/plans/2026-03-23-ai-coding-tutor-prd.md)
- [Technical architecture](docs/plans/2026-03-23-ai-coding-tutor-technical-architecture.md)
- [API spec](docs/plans/2026-03-23-ai-coding-tutor-api-spec.md)
- [Database schema design](docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md)
- [AI orchestration design](docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md)
- [Admin console design](docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md)

When code and documentation disagree, treat code and migrations as the source of truth, then update the docs.

## Contributing

Contributions are welcome. Good first areas include documentation, local setup improvements, targeted test scripts, UI polish, issue reproduction, and small service-level fixes.

Before opening a pull request:

1. Read [CONTRIBUTING.md](CONTRIBUTING.md).
2. Keep the change narrowly scoped.
3. Run the smallest relevant verification command.
4. Never include secrets, production credentials, user data, or private operational notes.

By contributing, you agree that your contribution is licensed under `AGPL-3.0-only`.

## Security

Please do not report vulnerabilities through public issues. See [SECURITY.md](SECURITY.md) for the private reporting process and secret-handling expectations.

## License

CodeTutor is licensed under the **GNU Affero General Public License v3.0 only**.

Copyright (C) 2026 Shanghai Zhiku Shuneng Technology Co., Ltd. (上海智酷数能科技有限公司).

SPDX identifier:

```text
AGPL-3.0-only
```

You may use, modify, self-host, and provide commercial services with this software. If you modify CodeTutor and make it available to users over a network, you must provide those users access to the corresponding source code under AGPL-3.0.

See [LICENSE](LICENSE) for the full license text.

## Trademark and Branding

The CodeTutor name, logo, the domain `www.codetutor.cn`, and all official service branding are proprietary to **Shanghai Zhiku Shuneng Technology Co., Ltd.（上海智酷数能科技有限公司）** and are not licensed under AGPL-3.0. Forks and self-hosted deployments may not imply they are the official CodeTutor service, and may not use the CodeTutor name or branding in ways that suggest endorsement or affiliation, unless they have explicit written permission.

Production credentials, private user data, hosted-service data, and private infrastructure configuration are not part of the open-source release.
