import test from "node:test"
import assert from "node:assert/strict"

import { createOpenApiJsonRouteHandler } from "../server/modules/api-docs/route-handler.ts"

function createRequest() {
  return new Request("http://localhost:3000/api/docs/openapi", {
    method: "GET",
  }) as never
}

test("openapi docs route returns 401 when request is not authenticated", async () => {
  const handler = createOpenApiJsonRouteHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录后再查看接口文档。",
  })

  const response = await handler(createRequest())

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录后再查看接口文档。",
    data: null,
  })
})

test("openapi docs route returns openapi document after auth passes", async () => {
  const handler = createOpenApiJsonRouteHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
  })

  const response = await handler(createRequest())
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.openapi, "3.1.0")
  assert.equal(body.info.title, "AI编程学习教练 API")
  assert.ok(body.paths["/api/learning/message"])
})
