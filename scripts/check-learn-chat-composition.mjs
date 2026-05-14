import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const learnPageSource = read("features/learning/pages/learn-page.tsx")
const learnChatSource = read("features/learning/components/chat.tsx")
const headerSource = read("features/learning/components/learn-chat-header.tsx")
const heroSource = read("features/learning/components/learn-chat-hero.tsx")
const messageListSource = read("features/learning/components/learn-chat-message-list.tsx")
const messageItemSource = read("features/learning/components/learn-chat-message-item.tsx")
const resumeSource = read("features/learning/components/learn-chat-resume-card.tsx")
const composerSource = read("features/learning/components/learn-chat-composer.tsx")
const richContentSource = read("features/learning/components/learn-chat-rich-content.tsx")

assert.match(
  learnPageSource,
  /LearnChat/,
  "learn page should keep rendering LearnChat as the center workspace entry",
)

assert.match(
  learnChatSource,
  /LearnChatHeader/,
  "LearnChat should compose a dedicated header component",
)
assert.match(
  learnChatSource,
  /LearnChatMessageList/,
  "LearnChat should compose a dedicated message list component",
)
assert.match(
  learnChatSource,
  /LearnChatComposer/,
  "LearnChat should compose a dedicated composer component",
)

assert.match(
  headerSource,
  /learn:chat-header-collapsed/,
  "learn chat header should persist its local collapsed state",
)
assert.match(
  headerSource,
  /重头开始/,
  "learn chat header should keep the restart action in the top bar",
)
assert.match(
  headerSource,
  /ChevronUp|ChevronDown/,
  "learn chat header should expose an expand and collapse affordance",
)
assert.match(
  headerSource,
  /className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"/,
  "learn chat header should preserve the existing header row layout contract",
)

assert.match(
  messageListSource,
  /LearnChatResumeCard/,
  "learn chat message list should compose a dedicated resume reminder card",
)
assert.match(
  messageListSource,
  /LearnChatHero/,
  "learn chat message list should compose a dedicated hero component",
)
assert.match(
  heroSource,
  /现在只做这一步/,
  "learn chat hero should keep the current-step hero copy",
)
assert.match(
  heroSource,
  /先理解方法/,
  "learn chat hero should teach the method before asking for practice evidence",
)
assert.match(
  heroSource,
  /跟着做/,
  "learn chat hero should expose actionable practice steps",
)
assert.match(
  heroSource,
  /提交说明/,
  "learn chat hero should explain what evidence the learner should submit",
)
assert.match(
  heroSource,
  /mt-6 flex gap-4[\s\S]*sm:items-center[\s\S]*sm:justify-between[\s\S]*rightPanel\.currentStep/,
  "learn chat hero should place title and stat cards in the same top row container",
)
assert.match(
  heroSource,
  /mt-4 text-\[15px\] leading-7 text-muted-foreground[\s\S]*rightPanel\.whyThisStep/,
  "learn chat hero should render step description as a full-width paragraph below the top row",
)
assert.doesNotMatch(
  heroSource,
  /<div className="mt-6 flex gap-4 sm:items-center sm:justify-between">[\s\S]*<p className="mt-3 max-w-4xl text-\[15px\] leading-7 text-muted-foreground">/,
  "learn chat hero top row should not include the long step description text block",
)
assert.match(
  heroSource,
  /max-w-\[22rem\] text-2xl font-bold/,
  "learn chat hero top-row title block should keep a constrained width for side-by-side balance",
)
assert.match(
  heroSource,
  /flex shrink-0 flex-wrap items-stretch gap-3 sm:justify-end/,
  "learn chat hero stats should stay on the right side within the top row",
)
assert.match(
  heroSource,
  /px-5 py-5 sm:px-6 sm:py-6[\s\S]*mt-4 text-\[15px\] leading-7 text-muted-foreground/,
  "learn chat hero description should remain inside the same top section but on its own row",
)
assert.match(
  heroSource,
  /rightPanel\.whyThisStep/,
  "learn chat hero should keep rendering whyThisStep copy",
)
assert.match(
  heroSource,
  /rightPanel\.currentStep/,
  "learn chat hero should keep rendering currentStep title",
)
assert.match(
  heroSource,
  /mission\.estimatedTime/,
  "learn chat hero should keep rendering estimated time stat",
)
assert.match(
  heroSource,
  /mission\.reward/,
  "learn chat hero should keep rendering reward stat",
)
assert.match(
  heroSource,
  /progressLabel/,
  "learn chat hero should keep rendering normalized progress label",
)
assert.match(heroSource, /mt-6 flex gap-4/, "learn chat hero should keep top-row spacing contract")
assert.match(heroSource, /sm:items-center/, "learn chat hero top row should align items vertically at sm and above")
assert.match(heroSource, /sm:justify-between/, "learn chat hero top row should split title and stats on larger screens")
assert.match(
  heroSource,
  /mt-4 text-\[15px\] leading-7/,
  "learn chat hero description should start below the top row with consistent rhythm",
)
assert.match(
  heroSource,
  /text-muted-foreground/,
  "learn chat hero description should keep subdued supporting tone",
)
assert.doesNotMatch(
  heroSource,
  /mt-3 max-w-4xl text-\[15px\] leading-7 text-muted-foreground/,
  "learn chat hero should no longer keep description inside the title column",
)
assert.match(
  resumeSource,
  /继续上次学习提醒|关闭继续上次学习提醒/,
  "learn chat resume card should keep the dismissible resume affordance",
)
assert.match(
  messageListSource,
  /加载更早消息/,
  "learn chat message list should keep the history pagination entry",
)
assert.match(
  messageListSource,
  /onToggleSpeech=\{onToggleSpeech\}/,
  "learn chat message list should pass speech playback controls into message items",
)
assert.match(
  messageItemSource,
  /aria-label=\{speechLabel\}/,
  "assistant message speech button should expose an accessible label",
)
assert.match(
  messageItemSource,
  /播读 AI 回复/,
  "assistant message item should include the default read-aloud affordance",
)
assert.match(
  learnChatSource,
  /\/learning\/message-speech/,
  "LearnChat should call the learning message speech endpoint",
)
assert.match(
  learnChatSource,
  /speechMessageId \?\? String\(message\.id\)/,
  "LearnChat should prefer persisted assistant message id for speech synthesis",
)
assert.match(
  composerSource,
  /消息输入框/,
  "learn chat composer should keep the accessible textarea label",
)
assert.match(
  composerSource,
  /onPaste=\{handlePaste\}/,
  "learn chat composer should accept pasted image files",
)
assert.match(
  composerSource,
  /onDrop=\{handleDrop\}/,
  "learn chat composer should accept dropped image files",
)
assert.match(
  richContentSource,
  /function CodeBlockCard/,
  "learn chat rich content should render code blocks through a reusable card",
)
assert.match(
  richContentSource,
  /aria-label=\{copied \? "代码已复制" : "复制代码"\}/,
  "learn chat code blocks should expose an accessible copy button",
)
assert.match(
  richContentSource,
  /navigator\.clipboard\.writeText\(code\)/,
  "learn chat code copy button should copy the raw code text",
)

console.log("Learn chat composition and header collapse wiring are present.")
