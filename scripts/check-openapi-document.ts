import test from "node:test"
import assert from "node:assert/strict"

import { buildOpenApiDocument } from "../server/modules/api-docs/openapi.ts"

test("openapi document covers all registered api operations and special transports", () => {
  const document = buildOpenApiDocument()
  const paths = document.paths ?? {}

  assert.equal(document.openapi, "3.1.0")
  assert.equal(document.info.title, "AI编程学习教练 API")

  const operations = Object.values(paths).flatMap((pathItem) =>
    Object.keys(pathItem).filter((method) =>
      ["get", "post", "patch", "put", "delete"].includes(method),
    ),
  )

  assert.equal(operations.length, 51)

  assert.ok(paths["/api/auth/login"]?.post)
  assert.ok(paths["/api/profile/me"]?.get)
  assert.ok(paths["/api/profile/me"]?.patch)
  assert.ok(paths["/api/profile/avatar"]?.post)
  assert.ok(paths["/api/learning/message"]?.post)
  assert.ok(paths["/api/learning/plan-from-material"]?.post)
  assert.ok(paths["/api/learning/plan-drafts/{id}/confirm"]?.post)
  assert.ok(paths["/api/learning/plan-drafts/{id}/regenerate"]?.post)
  assert.ok(paths["/api/admin/auth/login"]?.post)
  assert.ok(paths["/api/admin/auth/session"]?.get)
  assert.ok(paths["/api/admin/auth/logout"]?.post)
  assert.ok(paths["/api/admin/dashboard/overview"]?.get)
  assert.ok(paths["/api/admin/profile/me"]?.get)
  assert.ok(paths["/api/admin/profile/me"]?.patch)
  assert.ok(paths["/api/admin/profile/avatar"]?.post)
  assert.ok(paths["/api/admin/feedback/{id}"]?.delete)
  assert.ok(paths["/api/admin/feedback/batch-delete"]?.post)
  assert.ok(paths["/api/admin/feedback/{id}/reply"]?.post)
  assert.ok(paths["/api/admin/feedback/{id}/user-snapshot"]?.get)
  assert.ok(paths["/api/admin/auth/change-password"]?.post)
  assert.ok(paths["/api/admin/users"]?.get)
  assert.ok(paths["/api/admin/users/export"]?.get)
  assert.ok(paths["/api/admin/users/{userId}"]?.get)
  assert.ok(paths["/api/admin/users/{userId}"]?.patch)
  assert.ok(paths["/api/admin/users/{userId}/soft-delete"]?.post)
  assert.ok(paths["/api/admin/users/{userId}/restore"]?.post)
  assert.ok(paths["/api/admin/learning-paths"]?.get)
  assert.ok(paths["/api/admin/learning-paths/export"]?.get)
  assert.ok(paths["/api/admin/learning-paths/{pathId}"]?.get)
  assert.ok(paths["/api/admin/learning-paths/{pathId}/status"]?.post)

  const avatarPost = paths["/api/profile/avatar"]?.post as
    | {
        requestBody?: {
          content?: Record<string, { schema?: unknown }>
        }
      }
    | undefined
  const avatarSchema = avatarPost?.requestBody?.content?.["multipart/form-data"]?.schema

  assert.ok(avatarSchema)

  const learningMessagePost = paths["/api/learning/message"]?.post as
    | {
        responses?: Record<
          string,
          {
            content?: Record<string, unknown>
          }
        >
      }
    | undefined
  const learningMessageResponses = learningMessagePost?.responses

  assert.ok(learningMessageResponses?.["200"]?.content?.["application/json"])
  assert.ok(learningMessageResponses?.["200"]?.content?.["text/event-stream"])
  assert.ok(
    (learningMessageResponses?.["200"]?.content?.["application/json"] as { example?: unknown })?.example,
  )

  const securitySchemes = document.components?.securitySchemes ?? {}
  assert.ok(securitySchemes.bearerAuth)
  assert.ok(securitySchemes.adminSecretHeader)

  const adminSecurity = paths["/api/admin/feedback"]?.get?.security ?? []
  assert.deepEqual(adminSecurity, [])

  const authLoginPost = paths["/api/auth/login"]?.post as
    | {
        responses?: Record<string, { description?: string; content?: Record<string, { example?: unknown }> }>
      }
    | undefined
  assert.equal(authLoginPost?.responses?.["200"]?.description, "登录成功")
  assert.ok(authLoginPost?.responses?.["200"]?.content?.["application/json"]?.example)
  assert.equal(authLoginPost?.responses?.["400"]?.description, "请求体中的 `loginType` 不合法。")

  const avatarPostResponses = paths["/api/profile/avatar"]?.post?.responses as
    | Record<string, { description?: string; content?: Record<string, { example?: unknown }> }>
    | undefined
  assert.equal(avatarPostResponses?.["400"]?.description, "缺少文件，或上传文件类型/大小未通过校验。")
  assert.deepEqual(avatarPostResponses?.["400"]?.content?.["application/json"]?.example, {
    code: "VALIDATION_FAILED",
    message: "头像仅支持 JPG、PNG、WebP 格式。",
    data: null,
  })

  const historyStatusPostResponses = paths["/api/history/{id}/status"]?.post?.responses as
    | Record<string, { description?: string; content?: Record<string, { example?: unknown }> }>
    | undefined
  assert.equal(historyStatusPostResponses?.["409"]?.description, "请求与当前资源状态冲突，需先处理前置条件。")
  assert.deepEqual(historyStatusPostResponses?.["409"]?.content?.["application/json"]?.example, {
    code: "CONFLICT",
    message: "当前已有进行中的学习计划",
    data: null,
  })
})
