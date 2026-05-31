# Security Policy

简体中文见下方。

## Supported Versions

The public repository currently tracks the active development version of CodeTutor. Security fixes should target the default branch unless maintainers explicitly mark a release branch as supported.

## Reporting a Vulnerability

Please do not report vulnerabilities through public GitHub issues.

Preferred reporting path:

1. Use GitHub private vulnerability reporting if it is enabled for this repository.
2. If private vulnerability reporting is not available, contact the maintainer through a private channel and include the word `SECURITY` in the subject.

Please include:

- A concise description of the issue.
- Affected routes, APIs, services, or configuration.
- Reproduction steps or proof-of-concept details.
- Impact assessment.
- Whether any secret, user data, or payment/AI provider credential may be exposed.

Do not include real user data, production credentials, or active private keys in the report. Redact sensitive values.

## Secret Handling

Never commit or disclose:

- `SUPABASE_SERVICE_ROLE_KEY`
- Provider API keys
- Payment merchant credentials, private keys, and certificates
- `ADMIN_API_SECRET`
- `AI_PROVIDER_SECRET_ENCRYPTION_KEY`
- Database credentials
- JWT/session secrets
- Real user data or private production logs

If a secret is exposed:

1. Revoke or rotate it immediately.
2. Remove it from the current tree.
3. Check whether it exists in git history.
4. Treat the secret as compromised even if the repository was private when it was committed.

## Security Scope

High-priority reports include:

- Authentication or authorization bypass.
- Admin privilege escalation.
- Supabase row-level security bypass.
- Payment or subscription entitlement manipulation.
- Provider key disclosure.
- Server-side request forgery.
- Cross-site scripting or account takeover paths.
- File upload or storage access control issues.
- Sensitive data exposure through logs, OpenAPI docs, public APIs, or client bundles.

## 中文说明

### 支持版本

公开仓库当前跟随 CodeTutor 的活跃开发版本。除非维护者明确标记某个发布分支仍受支持，安全修复默认面向默认分支。

### 漏洞报告

请不要通过公开 GitHub issue 报告安全漏洞。

优先报告方式：

1. 如果仓库启用了 GitHub private vulnerability reporting，请使用该功能。
2. 如果没有启用，请通过私密渠道联系维护者，并在标题中包含 `SECURITY`。

报告中建议包含：

- 问题简述。
- 受影响的路由、API、服务或配置。
- 复现步骤或 PoC 细节。
- 影响范围判断。
- 是否可能暴露密钥、用户数据或支付/AI Provider 凭据。

请不要在报告中放入真实用户数据、生产凭据或有效私钥。敏感值需要脱敏。

### 密钥处理

禁止提交或公开：

- `SUPABASE_SERVICE_ROLE_KEY`
- Provider API Key
- 支付商户凭据、私钥和证书
- `ADMIN_API_SECRET`
- `AI_PROVIDER_SECRET_ENCRYPTION_KEY`
- 数据库凭据
- JWT / Session Secret
- 真实用户数据或生产日志

如果密钥泄露：

1. 立即吊销或轮换。
2. 从当前代码树移除。
3. 检查 git 历史中是否存在。
4. 即使当时仓库是私有的，也按已泄露处理。

### 安全范围

高优先级问题包括：

- 认证或授权绕过。
- 后台权限提升。
- Supabase RLS 绕过。
- 支付或订阅权益篡改。
- Provider Key 泄露。
- SSRF。
- XSS 或账号接管路径。
- 文件上传或 Storage 访问控制问题。
- 日志、OpenAPI 文档、公开 API 或前端 bundle 暴露敏感信息。
