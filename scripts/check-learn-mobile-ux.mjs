import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

const learnPageSource = source("features/learning/pages/learn-page.tsx")
const appShellSource = source("components/layout/app-shell.tsx")
const appMobileNavSource = source("components/layout/app-mobile-nav.tsx")
const headerSource = source("features/learning/components/learn-chat-header.tsx")
const heroSource = source("features/learning/components/learn-chat-hero.tsx")
const messageItemSource = source("features/learning/components/learn-chat-message-item.tsx")
const composerSource = source("features/learning/components/learn-chat-composer.tsx")
const richContentSource = source("features/learning/components/learn-chat-rich-content.tsx")
const rightPanelSource = source("features/learning/components/right-panel.tsx")

assert.match(
  learnPageSource,
  /mobileTitle="今日练习"/,
  "Learn page mobile title should use the requested two-line mobile header title.",
)

assert.match(
  learnPageSource,
  /mobileSubtitle=\{[\s\S]*当前学习工具:/,
  "Learn page mobile subtitle should show the current learning tool.",
)

assert.match(
  learnPageSource,
  /mobileNavVariant="minimal"/,
  "Learn page should opt into the minimal homepage-aligned mobile nav icon style.",
)

assert.match(
  learnPageSource,
  /showMobileBrand=\{false\}/,
  "Learn page mobile nav should hide the CODETUTOR eyebrow to keep two text lines.",
)

assert.match(
  learnPageSource,
  /mobileSheetTopSpacing="compact"/,
  "Learn page mobile sheets should opt into the compact top spacing requested for this page.",
)

assert.match(
  appMobileNavSource,
  /mobileNavVariant\?: "default" \| "minimal"/,
  "AppMobileNav should support a learn-only minimal icon style without changing other pages.",
)

assert.match(
  appMobileNavSource,
  /showBrand\?: boolean/,
  "AppMobileNav should allow learn page to hide the brand eyebrow on mobile.",
)

assert.match(
  appMobileNavSource,
  /mobileNavVariant === "minimal"/,
  "AppMobileNav should branch icon button styling for the minimal variant.",
)

assert.match(
  appMobileNavSource,
  /mobileNavVariant === "minimal" \? "px-2" : "px-4"/,
  "Learn minimal mobile nav should use tighter horizontal padding without changing default mobile nav.",
)

assert.match(
  appMobileNavSource,
  /mobileNavVariant === "minimal" \? "gap-2" : "gap-3"/,
  "Learn minimal mobile nav should use the tighter gap requested between icon and title area.",
)

assert.match(
  appShellSource,
  /renderAside\(\{ mobile: true \}\)/,
  "AppShell should pass mobile state into the aside sheet renderer.",
)

assert.match(
  learnPageSource,
  /renderAside=\{\(\{ mobile \}\) =>/,
  "LearnPage should consume mobile state for its contextual aside.",
)

assert.match(
  rightPanelSource,
  /compact\?: boolean/,
  "LearnRightPanel should support a compact mobile variant.",
)

assert.match(
  rightPanelSource,
  /if \(compact\)/,
  "LearnRightPanel should render a dedicated compact branch for mobile sheets.",
)

assert.match(
  rightPanelSource,
  /核心步骤/,
  "Compact right panel should prioritize actionable steps over long duplicated lessons.",
)

assert.match(
  headerSource,
  /hidden sm:inline-flex/,
  "Learn chat restart action should be hidden from the mobile header.",
)

assert.match(
  headerSource,
  /hidden sm:flex[\s\S]*当前任务/,
  "Learn chat current-task capsule should be hidden on mobile and preserved for desktop.",
)

assert.match(
  headerSource,
  /flex-row items-center justify-between/,
  "Learn chat mobile header should keep the title and collapse icon on one row.",
)

assert.match(
  headerSource,
  /size-7 border-0 bg-transparent[\s\S]*sm:size-8 sm:border/,
  "Learn chat collapse icon should use a minimal mobile icon style while preserving the desktop button treatment.",
)

assert.match(
  heroSource,
  /md:hidden/,
  "Learn chat hero should include a mobile-only compact layout.",
)

assert.match(
  heroSource,
  /hidden md:block/,
  "Learn chat hero should keep the richer desktop layout out of the mobile flow.",
)

assert.match(
  heroSource,
  /line-clamp-2/,
  "Mobile learn chat hero should clamp long task context copy.",
)

assert.match(
  composerSource,
  /overflow-x-auto[\s\S]*flex-nowrap/,
  "Composer quick actions should remain on one horizontally scrollable row on mobile.",
)

assert.match(
  composerSource,
  /aria-hidden="true" className="w-4 shrink-0 sm:hidden"/,
  "Composer quick actions should keep trailing mobile scroll padding after the last chip.",
)

assert.match(
  composerSource,
  /whitespace-nowrap/,
  "Composer quick action labels should stay on one line.",
)

assert.match(
  composerSource,
  /pointer-events-none absolute inset-x-0[\s\S]*点击这里输入问题/,
  "Composer placeholder should be rendered as a one-line overlay for mobile ellipsis.",
)

assert.doesNotMatch(
  composerSource,
  /placeholder=\{input \? undefined : "把教程链接、代码片段或你卡住的问题发给我"\}/,
  "Composer textarea should not keep the long native placeholder because it increases empty scrollHeight on mobile.",
)

assert.match(
  composerSource,
  /min-h-6 h-6[\s\S]*style=\{\{ height: "24px"/,
  "Composer textarea should initialize at a one-line height on mobile.",
)

assert.match(
  composerSource,
  /h-9 w-9/,
  "Composer icon controls should use 44px mobile touch targets.",
)

assert.match(
  messageItemSource,
  /w-full max-w-full[\s\S]*sm:w-auto sm:max-w-\[85%\]/,
  "Mobile user and assistant message bubbles should use full width while preserving desktop width.",
)

assert.match(
  messageItemSource,
  /hidden sm:flex[\s\S]*meta\.avatarLabel/,
  "Learn chat message avatars should be hidden on mobile and preserved on desktop.",
)

assert.match(
  messageItemSource,
  /isUser \? "items-end" : "items-start"/,
  "Message content should align right for users and left for AI on mobile.",
)

assert.match(
  messageItemSource,
  /flex-col items-start[\s\S]*sm:flex-row/,
  "Assistant message actions should stack speech controls below action chips on mobile.",
)

assert.match(
  richContentSource,
  /max-w-full min-w-0/,
  "Rich content code blocks should protect against mobile overflow.",
)

assert.match(
  richContentSource,
  /text-\[12px\] sm:text-\[13px\]/,
  "Code blocks should use a smaller mobile font and restore desktop sizing at sm.",
)

assert.match(
  appShellSource,
  /mobileSheetTopSpacing === "compact" \? "pt-8" : "pt-16"/,
  "Learn mobile sheets should support the requested compact top safe space without changing defaults.",
)

console.log("Learn mobile UX checks passed.")
