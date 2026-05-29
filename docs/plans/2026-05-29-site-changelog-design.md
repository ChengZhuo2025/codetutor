# 站点更新日志自动生成设计

> 文档类型：功能设计方案  
> 创建日期：2026-05-29  
> 状态：已实施  
> 适用范围：管理后台「站点信息 / 更新日志」首版，以及用户端公开更新日志展示  
> 关联文档：
>
> - `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`
> - `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
> - `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
> - `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`

---

## 1. 背景

当前项目已经具备站点信息管理能力，包括网站基础信息、通用文章和帮助中心。新增「更新日志」后，站点运营可以把真实软件开发进展整理成用户可读的版本记录，让用户看到产品持续迭代。

用户确认的首版边界如下：

1. 管理后台在「站点信息」下新增「更新日志」栏目。
2. 新增数据库表保存更新日志草稿、发布内容、关联 commit 和生成快照。
3. 后端使用后台专用 Agent，对接已在数据库中配置完成的 `DeepSeek V4 Pro` 模型，模型 code 以当前后台配置 `deepseek-v4-pro` 为准。
4. Git 提交来源首版使用当前仓库本地 `.git` 记录。
5. 每天生成一篇更新日志草稿，由管理员审核、编辑后发布。
6. 用户端公开展示已发布更新日志。
7. Markdown 编辑器和渲染都复用现有组件与方法，不引入新 Markdown 解析器。

## 2. 目标

首版目标：

1. 管理员可以在 `/admin/site/changelog` 查看、筛选、编辑、发布和归档更新日志。
2. 管理员可以按日期从本地 Git commits 生成 AI 草稿。
3. AI 生成只产出 `draft`，不会自动发布。
4. 管理员可以编辑标题和 Markdown 正文，并通过现有 `MarkdownContent` 预览。
5. 用户端可以访问公开更新日志列表和详情，只看到 `published` 内容。
6. 服务端记录 Git 来源、AI agent/model 快照、调用审计 id 和管理员发布信息。
7. 本地 Git 不可用、当天无 commit、已有已发布日志、模型未启用等场景返回明确业务错误。

## 3. 非目标

首版不做以下能力：

1. 不自动发布 AI 生成内容。
2. 不接用户通知中心，不推送站内提醒。
3. 不引入 Redis、队列或常驻 worker。
4. 不接 GitHub/GitLab API。
5. 不改 CI/CD 流水线。
6. 不做多语言更新日志。
7. 不做复杂版本号管理、语义化 release、回滚或灰度发布。
8. 不新增 Markdown 编辑器库，继续复用现有 `Textarea variant="code"` 和 `MarkdownContent`。

## 4. 总体方案

新增独立服务域：

```text
server/modules/site-changelog/
```

前端入口挂在管理后台「站点信息」下：

```text
/admin/site/changelog
```

公开用户端入口建议新增：

```text
/changelog
GET /api/site/changelog
GET /api/site/changelog/{entryId}
```

后台使用以下 API：

```text
GET  /api/admin/site/changelog
POST /api/admin/site/changelog/generate
GET  /api/admin/site/changelog/{entryId}
PATCH /api/admin/site/changelog/{entryId}
POST /api/admin/site/changelog/{entryId}/publish
POST /api/admin/site/changelog/{entryId}/archive
```

生成链路：

```text
管理员选择日期
-> 后端读取本地 git log
-> 过滤和结构化 commits
-> 调用 site-changelog-writer Agent + deepseek-v4-pro
-> 写入 draft
-> 管理员编辑 Markdown
-> 管理员发布
-> 用户端公开读取 published 日志
```

这个方案延续现有站点信息模块的管理方式，同时复用 AI 编排中的 provider/model/agent 抽象，不把 DeepSeek API Key 或模型调用细节写死到业务页面。

## 5. 数据模型

新增迁移建议编号：

```text
057_create_site_changelog.sql
```

新增表：

```sql
CREATE TABLE public.site_changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary_markdown TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  commit_from_sha VARCHAR(64),
  commit_to_sha VARCHAR(64),
  commit_count INTEGER NOT NULL DEFAULT 0,
  source_commits_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by_agent_code VARCHAR(64),
  provider_code_snapshot VARCHAR(64),
  model_code_snapshot VARCHAR(128),
  llm_invocation_id UUID REFERENCES public.llm_invocations(id),
  generation_error TEXT,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_changelog_entries_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT site_changelog_entries_publish_check
    CHECK (
      (status = 'published' AND published_at IS NOT NULL)
      OR (status <> 'published')
    )
);
```

建议索引：

```sql
CREATE UNIQUE INDEX uidx_site_changelog_entries_log_date_active
ON public.site_changelog_entries(log_date)
WHERE status IN ('draft', 'published');

CREATE INDEX idx_site_changelog_entries_status_date
ON public.site_changelog_entries(status, log_date DESC);

CREATE INDEX idx_site_changelog_entries_published_at
ON public.site_changelog_entries(published_at DESC)
WHERE status = 'published';
```

约束含义：

1. 同一天最多一个活跃草稿或已发布日志，避免重复生成。
2. `archived` 可保留历史，不参与唯一活跃约束。
3. 公共接口不返回 `source_commits_json`，只在管理后台详情中展示。

## 6. Agent 与模型

新增后台专用 Agent：

```text
agent_templates.code = site-changelog-writer
default_model_code = deepseek-v4-pro
```

该 Agent 只服务更新日志生成，不进入用户侧 `/learn` 对话，也不参与学习任务生成。

Prompt 核心规则：

1. 面向真实用户写，避免内部工程黑话。
2. 按「新增」「优化」「修复」「后台管理」等自然分组。
3. 不编造 commit 中没有的信息。
4. 不公开内部 hash、分支名、数据库迁移编号、环境变量、密钥、作者邮箱。
5. 如果当天 commits 主要是内部维护，可以生成短日志，并标记建议管理员确认是否发布。
6. 输出 JSON，包含 `title`、`summaryMarkdown`、`publishRecommendation`、`riskNotes`。

服务端使用现有非流式 `invokeAIProvider`。调用完成后写入 `llm_invocations`，并把 invocation id、agent code、provider code、model code 快照保存到 `site_changelog_entries`。

## 7. Git 提交读取

首版使用本地 Git：

```text
git log --since=<date 00:00> --until=<date 23:59:59> --no-merges --format=<structured format>
```

服务封装在：

```text
server/modules/site-changelog/git-source.ts
```

输出结构：

```ts
type SiteChangelogCommit = {
  sha: string
  shortSha: string
  subject: string
  body: string | null
  authorName: string
  authorEmail: string | null
  committedAt: string
}
```

处理规则：

1. 默认排除 merge commit。
2. 空 subject、明显自动生成的噪音 commit 可在服务层过滤。
3. `source_commits_json` 保存完整结构，供管理后台追溯。
4. 公共接口不暴露 commit 明细。
5. 如果生产环境没有 `.git`，返回 `GIT_SOURCE_UNAVAILABLE`，提示管理员当前部署不支持本地 Git 读取。

## 8. 后台页面

新增页面：

```text
app/(admin-shell)/admin/site/changelog/page.tsx
features/admin-site/components/site-changelog-page.tsx
```

页面结构：

1. 顶部标题：更新日志。
2. 操作区：生成今日草稿、按日期生成、刷新列表。
3. 筛选区：状态、日期范围、关键词。
4. 表格：日期、标题、状态、commit 数、模型、最近更新、操作。
5. 右侧 Sheet：查看 / 编辑详情。
6. 发布动作二次确认。

编辑器复用现有模式：

1. 标题使用 `Input`。
2. Markdown 正文使用 `Textarea variant="code"`。
3. 预览使用 `MarkdownContent`。
4. commit 明细以只读列表展示在后台，不进入用户端。

菜单新增在：

```text
features/admin-shell/data/menu-config.ts
```

归属「站点信息」，位于「帮助中心」附近。

## 9. 用户端公开展示

新增公开页面：

```text
app/changelog/page.tsx
features/site/components/changelog-page.tsx
```

首版展示：

1. 已发布日志列表，按 `publishedAt` 或 `logDate` 倒序。
2. 每条展示日期、标题、Markdown 内容。
3. 空状态展示“暂无更新日志”。

营销页 footer 增加「更新日志」入口，和用户协议、隐私政策、帮助中心同级。公开页面和详情都只读取 `published`。

公共 API：

```text
GET /api/site/changelog?page=1&limit=20
GET /api/site/changelog/{entryId}
```

响应不包含：

```text
sourceCommitsJson
authorEmail
llmInvocationId
generationError
updatedByAdminId
```

## 10. 权限、错误与审计

后台 API 全部使用 `getRequestAdmin`。公共 API 不要求登录，但只返回已发布内容。

业务错误建议：

| code | 场景 |
| --- | --- |
| `GIT_SOURCE_UNAVAILABLE` | 当前运行环境没有 `.git` 或 git 命令不可用 |
| `NO_COMMITS_FOUND` | 指定日期无可用 commits |
| `CHANGELOG_ALREADY_PUBLISHED` | 指定日期已有 published 日志 |
| `CHANGELOG_DRAFT_EXISTS` | 指定日期已有 draft，需显式 regenerate |
| `AI_MODEL_UNAVAILABLE` | `deepseek-v4-pro` 或绑定 Agent 不可用 |
| `AI_GENERATION_FAILED` | provider 调用失败或返回格式不合法 |
| `INVALID_STATUS_TRANSITION` | 已发布日志不能直接改回 draft |

审计：

1. 生成、编辑、发布、归档写 `admin_audit_logs`。
2. AI 调用写 `llm_invocations`。
3. 表内保留 `updated_by_admin_id`。

## 11. 文档同步范围

实施时需要同步：

1. `AGENTS.md`：当前已实现能力和迁移编号。
2. `docs/plans/README.md`：状态速览、迁移列表、管理后台页面列表。
3. `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`：新增后台与公开 API。
4. `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`：新增表和约束。
5. `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`：新增后台专用 `site-changelog-writer` Agent。
6. `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`：新增「站点信息 / 更新日志」能力。
7. `server/modules/api-docs/openapi.ts` 与 `server/modules/api-docs/schemas.ts`：新增 OpenAPI。

## 12. 验收标准

1. 管理员可以从后台生成指定日期更新日志草稿。
2. 生成草稿使用 `site-changelog-writer` 与 `deepseek-v4-pro`。
3. 草稿不会自动发布。
4. 管理员可以编辑 Markdown 并预览。
5. 管理员发布后，用户端 `/changelog` 可见。
6. 未发布、归档、生成失败内容不对用户端公开。
7. 公共接口不暴露 commit 明细和 AI 调用内部信息。
8. 本地 Git 不可用时返回可理解错误。
9. 新增路由纳入 OpenAPI 和自动化检查。
