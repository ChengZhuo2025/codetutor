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
const resumeSource = read("features/learning/components/learn-chat-resume-card.tsx")
const composerSource = read("features/learning/components/learn-chat-composer.tsx")

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
  composerSource,
  /消息输入框/,
  "learn chat composer should keep the accessible textarea label",
)

console.log("Learn chat composition and header collapse wiring are present.")
