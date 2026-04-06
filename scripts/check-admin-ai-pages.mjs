import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const overviewSource = readFileSync(
  new URL("../features/admin-ai/components/ai-overview.tsx", import.meta.url),
  "utf8",
)

const providerSource = readFileSync(
  new URL("../features/admin-ai/components/provider-management.tsx", import.meta.url),
  "utf8",
)

const agentSource = readFileSync(
  new URL("../features/admin-ai/components/agent-management.tsx", import.meta.url),
  "utf8",
)

const testSource = readFileSync(
  new URL("../features/admin-ai/components/ai-test-console.tsx", import.meta.url),
  "utf8",
)

const menuSource = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)

assert.match(overviewSource, /AI 运营/, "The AI overview page should render the AI operations title")
assert.match(overviewSource, /近 7 天调用|最近失败/, "The AI overview page should expose runtime overview cards")
assert.match(providerSource, /Provider 管理|新建 Provider|Base URL/, "The Provider page should expose provider CRUD fields")
assert.match(providerSource, /API Key|secretMasked|密钥来源/, "The Provider page should expose masked secret management affordances")
assert.match(agentSource, /Agent 管理|System Prompt|Developer Prompt/, "The Agent page should expose real agent template fields")
assert.match(testSource, /命中预览|真实 AI 测试|llm_invocations/, "The test page should expose preview and real test flows")
assert.match(menuSource, /label: "AI 运营".*active: true/s, "The admin menu should enable the AI operations entry")

console.log("Admin AI pages expose the expected information architecture and menu wiring.")
