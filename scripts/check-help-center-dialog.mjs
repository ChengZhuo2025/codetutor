import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

const dialogUrl = new URL("../components/layout/help-center-dialog.tsx", import.meta.url)
const footerSource = readFileSync(
  new URL("../features/marketing/components/footer.tsx", import.meta.url),
  "utf8",
)

assert.equal(
  existsSync(dialogUrl),
  true,
  "Help center should be implemented as a reusable public dialog component.",
)

const dialogSource = readFileSync(dialogUrl, "utf8")

assert.match(
  footerSource,
  /HelpCenterDialog/,
  "Landing footer should render the reusable HelpCenterDialog.",
)
assert.doesNotMatch(
  footerSource,
  /帮助中心内容正在建设中/,
  "Landing footer should not show the old help center placeholder copy.",
)
assert.match(
  dialogSource,
  /const \[expandedId, setExpandedId\] = useState<string>/,
  "Help center accordion should use one controlled expanded item id.",
)
assert.match(
  dialogSource,
  /setExpandedId\(item\.id\)/,
  "Opening an FAQ item should replace the previously expanded item.",
)
assert.doesNotMatch(
  dialogSource,
  /setExpandedId\(\(current\).*null/s,
  "Help center should keep one item expanded instead of allowing all items to collapse.",
)
assert.match(
  dialogSource,
  /aria-expanded=\{isExpanded\}/,
  "FAQ triggers should expose expanded state for accessibility.",
)
assert.match(
  dialogSource,
  /max-h-\[220px\].*opacity-100/s,
  "FAQ panels should animate open with height and opacity transitions.",
)
assert.match(
  dialogSource,
  /学习记录会保存多久/,
  "Help center should include learning history guidance.",
)
assert.match(
  dialogSource,
  /待支付订单可以继续支付吗/,
  "Help center should include order payment guidance.",
)
assert.match(
  dialogSource,
  /如何开始一条新的学习计划/,
  "Help center should include getting-started guidance.",
)

console.log("Help center dialog is reusable and uses a single-open FAQ accordion.")
