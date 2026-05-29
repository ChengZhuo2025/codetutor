import { existsSync, readFileSync } from "node:fs"
import assert from "node:assert/strict"

assert.equal(existsSync("app/changelog/page.tsx"), true, "/changelog route must exist")
assert.equal(existsSync("features/site/components/changelog-page.tsx"), true, "public changelog component must exist")

const page = readFileSync("app/changelog/page.tsx", "utf8")
const component = readFileSync("features/site/components/changelog-page.tsx", "utf8")
const adminComponent = readFileSync("features/admin-site/components/site-changelog-page.tsx", "utf8")
const footer = readFileSync("features/marketing/components/footer.tsx", "utf8")
const dialog = readFileSync("features/marketing/components/changelog-dialog.tsx", "utf8")

assert.match(page, /ChangelogPage/)
assert.match(component, /MarkdownContent/)
assert.match(page, /loadPublicSiteChangelogEntries/)
assert.doesNotMatch(component, /sourceCommits|llmInvocationId|generationError|updatedByAdminId/)
assert.match(footer, /ChangelogDialog/)
assert.doesNotMatch(footer, /href="\/changelog"/)
assert.match(dialog, /\/api\/site\/changelog/)
assert.match(dialog, /MarkdownContent/)
assert.match(dialog, /<ol className="space-y-0">/, "changelog dialog should render entries as steps")
assert.match(dialog, /grid-cols-\[24px_minmax\(0,1fr\)\]/, "changelog dialog should keep a left step rail")
assert.match(dialog, /<time className=/, "changelog dialog should align title and date outside the content card")
assert.doesNotMatch(dialog, /sourceCommits|llmInvocationId|generationError|updatedByAdminId/)
assert.match(adminComponent, /hasUnsavedChanges/)
assert.match(adminComponent, /保存后发布/)

console.log("public changelog page assertions passed")
