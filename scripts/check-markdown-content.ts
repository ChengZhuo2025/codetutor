import test from "node:test"
import assert from "node:assert/strict"

import {
  renderMarkdownInlineHtml,
  sanitizeMarkdownHref,
} from "../features/site/lib/markdown.ts"

test("sanitizeMarkdownHref only allows safe public link targets", () => {
  assert.equal(sanitizeMarkdownHref("https://example.com/a?x=1"), "https://example.com/a?x=1")
  assert.equal(sanitizeMarkdownHref("mailto:support@example.com"), "mailto:support@example.com")
  assert.equal(sanitizeMarkdownHref("/help/articles"), "/help/articles")
  assert.equal(sanitizeMarkdownHref("javascript:alert(1)"), null)
  assert.equal(sanitizeMarkdownHref("data:text/html,<script>alert(1)</script>"), null)
})

test("renderMarkdownInlineHtml escapes text and strips unsafe links", () => {
  const html = renderMarkdownInlineHtml(
    "查看 [安全链接](https://example.com?q=\"x\") 和 [危险链接](javascript:alert(1)) <script>",
  )

  assert.match(html, /href="https:\/\/example\.com\?q=&quot;x&quot;"/)
  assert.match(html, />安全链接<\/a>/)
  assert.match(html, /危险链接/)
  assert.doesNotMatch(html, /href="javascript:/)
  assert.doesNotMatch(html, /<script>/)
})
