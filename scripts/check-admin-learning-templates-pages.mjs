import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const listSource = readFileSync(
  new URL("../features/admin-learning-templates/components/learning-template-list.tsx", import.meta.url),
  "utf8",
)
const editorSource = readFileSync(
  new URL("../features/admin-learning-templates/components/learning-template-editor-page.tsx", import.meta.url),
  "utf8",
)
const listRouteSource = readFileSync(
  new URL("../app/(admin-shell)/admin/learning/templates/page.tsx", import.meta.url),
  "utf8",
)
const editorRouteSource = readFileSync(
  new URL("../app/(admin-shell)/admin/learning/templates/[templateId]/page.tsx", import.meta.url),
  "utf8",
)
const menuSource = readFileSync(
  new URL("../features/admin-shell/data/menu-config.ts", import.meta.url),
  "utf8",
)
const headerSource = readFileSync(
  new URL("../features/admin-shell/components/admin-header.tsx", import.meta.url),
  "utf8",
)

assert.match(listSource, /学习路径模板|新建模板|AI 生成|同步未开始/, "Template list should expose core operations.")
assert.match(listSource, /\/admin\/learning\/templates\?\$\{params\.toString\(\)\}/, "Template list should read the admin templates API.")
assert.match(editorSource, /保存模板|AI 生成模板草稿|学习步骤|发布设置/, "Template editor should expose save, AI draft, step editing, and publish settings.")
assert.match(editorSource, /\/admin\/learning\/templates\/generate|\/admin\/learning\/templates\/\$\{templateId\}\/generate/, "Template editor should call AI generation endpoints.")
assert.match(listRouteSource, /LearningTemplateListPage/, "List app route should mount the template list page.")
assert.match(editorRouteSource, /LearningTemplateEditorPage/, "Editor app route should mount the template editor page.")
assert.match(menuSource, /label: "路径模板".*href: "\/admin\/learning\/templates"/s, "Admin menu should include the template management entry.")
assert.match(headerSource, /学习运营 \/ 路径模板/, "Admin header should include the template breadcrumb.")

console.log("Admin learning template pages expose the expected operations IA.")
