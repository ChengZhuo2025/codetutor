# Contributing to CodeTutor

Thanks for your interest in CodeTutor. This project is still moving from a private full-stack MVP toward a public contributor-friendly repository, so the best contributions are focused, reproducible, and easy to review.

简体中文见下方。

## License of Contributions

CodeTutor is licensed under `AGPL-3.0-only`.

By submitting a pull request, patch, issue reproduction, or other contribution, you agree that your contribution is licensed under `AGPL-3.0-only` unless a separate written agreement says otherwise.

Do not contribute code, assets, datasets, documentation, or generated output unless you have the right to license it under `AGPL-3.0-only`.

## Good First Contributions

Good early contribution areas include:

- README and setup documentation.
- Local Supabase bootstrap improvements.
- `.env.example` completeness and validation.
- Targeted verification scripts under `scripts/`.
- Small UI polish that matches the existing design system.
- Bug reproductions with clear steps.
- Service-level fixes with focused tests.
- OpenAPI/schema documentation sync.

Avoid large rewrites or architectural changes as first contributions.

## Development Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Fill `.env.local` with your own Supabase and provider settings. Never commit real secrets.

The database schema is tracked in `supabase/migrations/`. A one-command local Supabase bootstrap is not available yet, so apply the checked-in migrations to a Supabase project using your normal Supabase workflow.

## Branch and Commit Style

- Keep branches scoped to one issue or one implementation concern.
- Use Conventional Commits when possible, for example:

```text
fix: prevent duplicate material plan confirmation
docs: improve local setup guide
test: add admin settings route coverage
```

## Pull Request Checklist

Before opening a PR:

- Keep the change narrowly scoped.
- Explain what changed and why.
- Link the related issue if one exists.
- Run the smallest relevant verification command.
- Update docs when routes, request/response bodies, schema, environment variables, or implemented capabilities change.
- Confirm the PR does not include secrets, real user data, private operational notes, or production credentials.

Useful commands:

```bash
pnpm lint
pnpm build
pnpm test:openapi-document
pnpm test:admin-users
pnpm test:admin-learning
pnpm test:admin-ai
pnpm test:admin-site
pnpm test:admin-settings
pnpm test:payment
```

Pick the command that actually covers your change. A lint pass does not prove runtime behavior, and a build pass does not prove a business flow.

## Documentation Sync Rules

When behavior changes, keep persistent docs aligned:

- API contract changes: update `server/modules/api-docs/openapi.ts`, `server/modules/api-docs/schemas.ts`, and the relevant docs under `docs/plans/`.
- Database or environment changes: update `supabase/migrations/`, `.env.example`, and the relevant architecture/schema docs.
- Admin AI/provider behavior changes: re-check the AI orchestration and admin console docs.
- Current project status changes: update `README.md`, `README.zh-CN.md`, `AGENTS.md`, and `docs/plans/README.md` when appropriate.

## Security and Secrets

Do not open public issues for vulnerabilities or leaked secrets. Follow [SECURITY.md](SECURITY.md).

Never commit:

- Supabase service role keys.
- Provider API keys.
- Payment credentials or private certificates.
- JWT/session secrets.
- Real user data.
- Production logs containing identifiers or tokens.

## 中文说明

感谢你关注 CodeTutor。这个项目正在从私有全栈 MVP 走向公开开源协作阶段，因此最适合的贡献是范围清晰、可复现、容易 review 的改动。

### 贡献授权

CodeTutor 使用 `AGPL-3.0-only`。

提交 Pull Request、patch、问题复现或其他贡献，即表示你同意你的贡献默认按 `AGPL-3.0-only` 授权，除非另有书面协议。

请不要提交你无权按 `AGPL-3.0-only` 授权的代码、素材、数据集、文档或生成内容。

### 适合优先贡献的方向

- README 和本地启动文档。
- 本地 Supabase 初始化体验。
- `.env.example` 完整性和校验。
- `scripts/` 下的定向验证脚本。
- 符合现有设计系统的小范围 UI 优化。
- 带明确复现步骤的 bug 报告。
- 带聚焦测试的服务层修复。
- OpenAPI / Schema 文档同步。

首次贡献不建议直接做大规模重写或架构调整。

### 开发环境

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

在 `.env.local` 中填入自己的 Supabase 和 Provider 配置。不要提交真实密钥。

数据库 schema 位于 `supabase/migrations/`。当前还没有一条命令完成本地 Supabase 初始化，请先按自己的 Supabase 工作流应用迁移。

### PR 检查清单

提交 PR 前请确认：

- 改动范围聚焦。
- 说明改了什么以及为什么改。
- 如有关联 issue，请在 PR 中链接。
- 运行能覆盖改动的最小验证命令。
- 如果修改了接口、请求/响应、数据库 schema、环境变量或已实现能力，同步更新文档。
- 不包含密钥、真实用户数据、私有运营备注或生产凭据。

### 文档同步规则

- API 契约变化：同步 `server/modules/api-docs/openapi.ts`、`server/modules/api-docs/schemas.ts` 和相关规划文档。
- 数据库或环境变量变化：同步 `supabase/migrations/`、`.env.example` 和相关架构/Schema 文档。
- Admin AI / Provider 行为变化：复查 AI 编排和管理后台设计文档。
- 当前项目状态变化：必要时同步 `README.md`、`README.zh-CN.md`、`AGENTS.md` 和 `docs/plans/README.md`。
