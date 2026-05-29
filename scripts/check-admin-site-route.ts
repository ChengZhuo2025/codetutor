import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  createAdminSiteArticleGetHandler,
  createAdminSiteArticlePatchHandler,
  createAdminSiteHelpCategoryListGetHandler,
  createAdminSiteHelpCategoryPatchHandler,
  createAdminSiteHelpCategoryPostHandler,
  createAdminSiteHelpItemListGetHandler,
  createAdminSiteHelpItemPatchHandler,
  createAdminSiteHelpItemPostHandler,
  createAdminSiteInformationGetHandler,
  createAdminSiteInformationPatchHandler,
  createPublicSiteGetHandler,
} from "../server/modules/admin-site/route-handler.ts"
import type {
  AdminSiteArticleResponseData,
  AdminSiteHelpCategoryResponseData,
  AdminSiteHelpItemListResponseData,
  AdminSiteHelpItemResponseData,
  AdminSiteInformationResponseData,
  PublicSiteResponseData,
} from "../lib/api/contracts/admin-site.ts"

const okAdmin = { ok: true as const, adminId: "550e8400-e29b-41d4-a716-446655440011" }
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string }
const forbiddenAdmin = {
  ok: false as const,
  reason: "forbidden" as const,
  message: "nope",
}

const sampleInformation: AdminSiteInformationResponseData = {
  logoUrl: "https://example.com/logo.png",
  siteName: "CodeTutor",
  siteSubtitle: "AI 编程学习教练",
  siteSlogan: "把教程变成可执行练习",
  siteDescription: "AI 编程学习陪练平台",
  seoKeywords: ["AI 编程", "学习陪练"],
  icpNumber: "沪ICP备2026015857号-2",
  copyright: "© 2026 CodeTutor. All rights reserved.",
  version: packageJson.version,
  updatedAt: "2026-05-18T00:00:00.000Z",
  updatedByAdminId: okAdmin.adminId,
}

const sampleArticle: AdminSiteArticleResponseData = {
  slug: "privacy_policy",
  title: "隐私政策",
  contentMarkdown: "## 隐私政策\n\n欢迎使用 CodeTutor。",
  effectiveDate: "2026-04-17",
  updatedAt: "2026-05-18T00:00:00.000Z",
  updatedByAdminId: okAdmin.adminId,
}

const sampleHelpCategory: AdminSiteHelpCategoryResponseData = {
  id: "550e8400-e29b-41d4-a716-446655440101",
  title: "开始学习",
  description: "学习计划与路径相关问题",
  displayOrder: 10,
  enabled: true,
  updatedAt: "2026-05-28T00:00:00.000Z",
  updatedByAdminId: okAdmin.adminId,
}

const sampleHelpItem: AdminSiteHelpItemResponseData = {
  id: "550e8400-e29b-41d4-a716-446655440201",
  categoryId: sampleHelpCategory.id,
  question: "如何开始一条新的学习计划？",
  answerMarkdown: "进入首页或学习页后，选择适合你的学习目标。",
  displayOrder: 10,
  enabled: true,
  updatedAt: "2026-05-28T00:00:00.000Z",
  updatedByAdminId: okAdmin.adminId,
}

const samplePublic: PublicSiteResponseData = {
  information: sampleInformation,
  articles: {
    aboutUs: {
      slug: "about_us",
      title: "关于我们",
      contentMarkdown: "## 关于我们",
      effectiveDate: "2026-04-17",
      updatedAt: "2026-05-18T00:00:00.000Z",
    },
    userAgreement: {
      slug: "user_agreement",
      title: "用户协议",
      contentMarkdown: "## 用户协议",
      effectiveDate: "2026-04-17",
      updatedAt: "2026-05-18T00:00:00.000Z",
    },
    privacyPolicy: {
      slug: "privacy_policy",
      title: "隐私政策",
      contentMarkdown: "## 隐私政策",
      effectiveDate: "2026-04-17",
      updatedAt: "2026-05-18T00:00:00.000Z",
    },
  },
  helpCenter: {
    categories: [
      {
        id: sampleHelpCategory.id,
        title: sampleHelpCategory.title,
        description: sampleHelpCategory.description,
        displayOrder: sampleHelpCategory.displayOrder,
        enabled: true,
        updatedAt: sampleHelpCategory.updatedAt,
        items: [
          {
            id: sampleHelpItem.id,
            categoryId: sampleHelpItem.categoryId,
            question: sampleHelpItem.question,
            answerMarkdown: sampleHelpItem.answerMarkdown,
            displayOrder: sampleHelpItem.displayOrder,
            enabled: true,
            updatedAt: sampleHelpItem.updatedAt,
          },
        ],
      },
    ],
  },
}

test("admin site information requires admin", async () => {
  const handler = createAdminSiteInformationGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    loadSiteInformation: async () => sampleInformation,
  })

  const res = await handler(new Request("http://localhost/api/admin/site/information"))
  assert.equal(res.status, 403)
})

test("admin site information returns current settings", async () => {
  const handler = createAdminSiteInformationGetHandler({
    getRequestAdmin: async () => okAdmin,
    loadSiteInformation: async () => sampleInformation,
  })

  const res = await handler(new Request("http://localhost/api/admin/site/information"))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.siteName, "CodeTutor")
  assert.deepEqual(body.data.seoKeywords, ["AI 编程", "学习陪练"])
})

test("admin site information patch rejects empty site name", async () => {
  const handler = createAdminSiteInformationPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteInformation: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/information", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName: "   " }),
    }),
  )

  assert.equal(res.status, 400)
})

test("admin site information patch returns updated settings", async () => {
  const handler = createAdminSiteInformationPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteInformation: async (_adminId, input) => ({
      ...sampleInformation,
      siteName: input.siteName ?? sampleInformation.siteName,
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/information", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName: "CodeTutor Pro" }),
    }),
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.siteName, "CodeTutor Pro")
})

test("admin site article get rejects unknown slug", async () => {
  const handler = createAdminSiteArticleGetHandler({
    getRequestAdmin: async () => okAdmin,
    loadSiteArticle: async () => sampleArticle,
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/articles/unknown"),
    { params: Promise.resolve({ slug: "unknown" }) },
  )

  assert.equal(res.status, 400)
})

test("admin site article patch rejects empty markdown", async () => {
  const handler = createAdminSiteArticlePatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteArticle: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/articles/privacy_policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentMarkdown: " " }),
    }),
    { params: Promise.resolve({ slug: "privacy_policy" }) },
  )

  assert.equal(res.status, 400)
})

test("admin site article patch updates markdown", async () => {
  const handler = createAdminSiteArticlePatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteArticle: async (_adminId, slug, input) => ({
      ...sampleArticle,
      slug,
      contentMarkdown: input.contentMarkdown ?? sampleArticle.contentMarkdown,
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/articles/privacy_policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentMarkdown: "## 新隐私政策\n\n正文" }),
    }),
    { params: Promise.resolve({ slug: "privacy_policy" }) },
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.contentMarkdown, "## 新隐私政策\n\n正文")
})

test("admin help categories require admin", async () => {
  const handler = createAdminSiteHelpCategoryListGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    loadSiteHelpCategories: async () => ({ items: [sampleHelpCategory] }),
  })

  const res = await handler(new Request("http://localhost/api/admin/site/help/categories"))
  assert.equal(res.status, 403)
})

test("admin help category post rejects empty title", async () => {
  const handler = createAdminSiteHelpCategoryPostHandler({
    getRequestAdmin: async () => okAdmin,
    createSiteHelpCategory: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/help/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    }),
  )

  assert.equal(res.status, 400)
})

test("admin help category post creates a category", async () => {
  const handler = createAdminSiteHelpCategoryPostHandler({
    getRequestAdmin: async () => okAdmin,
    createSiteHelpCategory: async (_adminId, input) => ({
      ...sampleHelpCategory,
      title: input.title,
      description: input.description ?? null,
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/help/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "账号与反馈", description: "登录、账号和反馈问题" }),
    }),
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.title, "账号与反馈")
  assert.equal(body.data.description, "登录、账号和反馈问题")
})

test("admin help category patch updates enabled state", async () => {
  const handler = createAdminSiteHelpCategoryPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteHelpCategory: async (_adminId, id, input) => ({
      ...sampleHelpCategory,
      id,
      enabled: input.enabled ?? sampleHelpCategory.enabled,
    }),
  })

  const res = await handler(
    new Request(`http://localhost/api/admin/site/help/categories/${sampleHelpCategory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    }),
    { params: Promise.resolve({ categoryId: sampleHelpCategory.id }) },
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.enabled, false)
})

test("admin help category patch maps missing category to not found", async () => {
  const handler = createAdminSiteHelpCategoryPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteHelpCategory: async () => {
      const error = new Error("帮助分类不存在。")
      error.name = "NOT_FOUND"
      throw error
    },
  })

  const res = await handler(
    new Request(`http://localhost/api/admin/site/help/categories/${sampleHelpCategory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    }),
    { params: Promise.resolve({ categoryId: sampleHelpCategory.id }) },
  )

  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.code, "NOT_FOUND")
})

test("admin help items list supports category filtering", async () => {
  const handler = createAdminSiteHelpItemListGetHandler({
    getRequestAdmin: async () => okAdmin,
    loadSiteHelpItems: async (categoryId) => {
      assert.equal(categoryId, sampleHelpCategory.id)
      return { items: [sampleHelpItem] } satisfies AdminSiteHelpItemListResponseData
    },
  })

  const res = await handler(
    new Request(`http://localhost/api/admin/site/help/items?categoryId=${sampleHelpCategory.id}`),
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.items[0].question, "如何开始一条新的学习计划？")
})

test("admin help item post rejects empty markdown answer", async () => {
  const handler = createAdminSiteHelpItemPostHandler({
    getRequestAdmin: async () => okAdmin,
    createSiteHelpItem: async () => {
      throw new Error("should not call")
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/help/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: sampleHelpCategory.id,
        question: "如何开始？",
        answerMarkdown: "   ",
      }),
    }),
  )

  assert.equal(res.status, 400)
})

test("admin help item post creates a markdown FAQ item", async () => {
  const handler = createAdminSiteHelpItemPostHandler({
    getRequestAdmin: async () => okAdmin,
    createSiteHelpItem: async (_adminId, input) => ({
      ...sampleHelpItem,
      categoryId: input.categoryId,
      question: input.question,
      answerMarkdown: input.answerMarkdown,
    }),
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/help/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: sampleHelpCategory.id,
        question: "Markdown 支持什么格式？",
        answerMarkdown: "支持 **加粗**、列表和链接。",
      }),
    }),
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.question, "Markdown 支持什么格式？")
  assert.equal(body.data.answerMarkdown, "支持 **加粗**、列表和链接。")
})

test("admin help item patch updates markdown and enabled state", async () => {
  const handler = createAdminSiteHelpItemPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteHelpItem: async (_adminId, id, input) => ({
      ...sampleHelpItem,
      id,
      answerMarkdown: input.answerMarkdown ?? sampleHelpItem.answerMarkdown,
      enabled: input.enabled ?? sampleHelpItem.enabled,
    }),
  })

  const res = await handler(
    new Request(`http://localhost/api/admin/site/help/items/${sampleHelpItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerMarkdown: "## 新答案", enabled: false }),
    }),
    { params: Promise.resolve({ itemId: sampleHelpItem.id }) },
  )

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.answerMarkdown, "## 新答案")
  assert.equal(body.data.enabled, false)
})

test("admin help item post maps missing category to validation error", async () => {
  const handler = createAdminSiteHelpItemPostHandler({
    getRequestAdmin: async () => okAdmin,
    createSiteHelpItem: async () => {
      const error = new Error("帮助分类不存在。")
      error.name = "VALIDATION_FAILED"
      throw error
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/help/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: sampleHelpCategory.id,
        question: "如何开始？",
        answerMarkdown: "请先选择有效分类。",
      }),
    }),
  )

  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.code, "VALIDATION_FAILED")
})

test("admin help item post maps category write conflict to conflict", async () => {
  const handler = createAdminSiteHelpItemPostHandler({
    getRequestAdmin: async () => okAdmin,
    createSiteHelpItem: async () => {
      const error = new Error("帮助分类不存在或已不可用。")
      error.name = "CONFLICT"
      throw error
    },
  })

  const res = await handler(
    new Request("http://localhost/api/admin/site/help/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: sampleHelpCategory.id,
        question: "如何开始？",
        answerMarkdown: "请先选择有效分类。",
      }),
    }),
  )

  assert.equal(res.status, 409)
  const body = await res.json()
  assert.equal(body.code, "CONFLICT")
})

test("public site endpoint returns information and seeded articles", async () => {
  const handler = createPublicSiteGetHandler({
    loadPublicSite: async () => samplePublic,
  })

  const res = await handler()
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.information.siteName, "CodeTutor")
  assert.equal(body.data.articles.privacyPolicy.title, "隐私政策")
  assert.equal(body.data.helpCenter.categories[0].title, "开始学习")
  assert.equal(body.data.helpCenter.categories[0].items[0].answerMarkdown, sampleHelpItem.answerMarkdown)
})
