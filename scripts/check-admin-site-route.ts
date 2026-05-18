import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminSiteArticleGetHandler,
  createAdminSiteArticlePatchHandler,
  createAdminSiteInformationGetHandler,
  createAdminSiteInformationPatchHandler,
  createPublicSiteGetHandler,
} from "../server/modules/admin-site/route-handler.ts"
import type {
  AdminSiteArticleResponseData,
  AdminSiteInformationResponseData,
  PublicSiteResponseData,
} from "../lib/api/contracts/admin-site.ts"

const okAdmin = { ok: true as const, adminId: "550e8400-e29b-41d4-a716-446655440011" }
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
  version: "0.1.110",
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

test("public site endpoint returns information and seeded articles", async () => {
  const handler = createPublicSiteGetHandler({
    loadPublicSite: async () => samplePublic,
  })

  const res = await handler()
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.information.siteName, "CodeTutor")
  assert.equal(body.data.articles.privacyPolicy.title, "隐私政策")
})
