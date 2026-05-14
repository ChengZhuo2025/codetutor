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

const modelManagementSource = readFileSync(
  new URL("../features/admin-ai/components/model-management.tsx", import.meta.url),
  "utf8",
)

const modelFormSource = readFileSync(
  new URL("../features/admin-ai/components/model-form-sheet.tsx", import.meta.url),
  "utf8",
)

const adminAIViewModelSource = readFileSync(
  new URL("../features/admin-ai/lib/view-model.ts", import.meta.url),
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

const mediaSettingsSource = readFileSync(
  new URL("../features/admin-ai/components/media-transcription-settings.tsx", import.meta.url),
  "utf8",
)

const mediaAttachmentsSource = readFileSync(
  new URL("../features/admin-ai/components/media-attachments.tsx", import.meta.url),
  "utf8",
)

const menuSource = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)

const sidebarSource = readFileSync(
  new URL("../features/admin-shell/components/admin-sidebar.tsx", import.meta.url),
  "utf8",
)

assert.match(overviewSource, /Ai 管理/, "The AI overview page should render the AI operations title")
assert.match(overviewSource, /近 7 天调用|最近失败/, "The AI overview page should expose runtime overview cards")
assert.match(providerSource, /Provider 管理|新建 Provider|Base URL/, "The Provider page should expose provider CRUD fields")
assert.match(providerSource, /API Key|secretMasked|密钥来源/, "The Provider page should expose masked secret management affordances")
assert.match(modelManagementSource, /Model 管理|模型类型|运行时用途|连接测试/, "The model page should expose structured model profile information")
assert.match(modelFormSource, /模型类别|运行时用途|连接测试模式|高级扩展配置/, "The model form should expose structured fields and relegate metadata to advanced config")
assert.match(`${modelFormSource}\n${adminAIViewModelSource}`, /TTS|tts|ASR 探测|TTS 探测/, "The model form should expose ASR/TTS model profile and connection test options")
assert.match(agentSource, /Agent 管理|System Prompt|Developer Prompt/, "The Agent page should expose real agent template fields")
assert.match(testSource, /命中预览|真实 AI 测试|llm_invocations/, "The test page should expose preview and real test flows")
assert.match(mediaSettingsSource, /转译设置|图片转译|语音转文本|文本转语音/, "The media settings page should expose all transcription setting types")
assert.match(mediaSettingsSource, /详情|编辑|modelOptions/, "The media settings page should expose detail and edit affordances")
assert.match(mediaAttachmentsSource, /附件管理|图片|语音|24h|7d|30d|90d/, "The media attachments page should expose attachment filters")
assert.match(mediaAttachmentsSource, /预览|previewUrl|<audio|DialogContent/, "The media attachments page should expose image and audio previews")
assert.match(menuSource, /label: "Ai 管理".*active: true/s, "The admin menu should enable the AI operations entry")
assert.match(menuSource, /label: "Ai 管理"[\s\S]*?\]\s*,\s*\},\s*\{\s*label: "多媒体管理"/, "Multimedia management should be a top-level menu directly after AI management")
assert.match(menuSource, /label: "多媒体管理"[\s\S]*children: \[/, "The multimedia management menu should expose its submenu")
assert.match(sidebarSource, /useState<Record<string, boolean>>\(\{\}\)/, "Admin sidebar submenu state should start empty")
assert.match(sidebarSource, /expandedItems\[item\.href\] \?\? isActive/, "Admin sidebar submenus should default to collapsed and expand only for active routes")

console.log("Admin AI pages expose the expected information architecture and menu wiring.")
