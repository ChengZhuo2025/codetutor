import test from "node:test"
import assert from "node:assert/strict"

import {
  createAuthPhoneStatusGetHandler,
  createAuthLoginPostHandler,
  createAuthLogoutPostHandler,
  createOAuthTempUserDiscardPostHandler,
} from "../server/modules/auth/route-handler.ts"

function createJsonRequest(url: string, body: string, headers?: HeadersInit) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  })
}

test("auth phone status route reports whether a phone can log in", async () => {
  const handler = createAuthPhoneStatusGetHandler({
    getPhoneRegistrationStatus: async (phone) => {
      assert.equal(phone, "13800138000")
      return {
        phone,
        registered: true,
      }
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/auth/phone-status?phone=13800138000"),
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    code: "OK",
    message: "success",
    data: {
      phone: "13800138000",
      registered: true,
    },
  })
})

test("auth phone status route rejects invalid phone numbers", async () => {
  const handler = createAuthPhoneStatusGetHandler({
    getPhoneRegistrationStatus: async () => {
      throw new Error("should not query invalid phone")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/auth/phone-status?phone=123"),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "请输入真实的 11 位中国大陆手机号。",
    data: null,
  })
})

test("auth login route writes user session cookie after successful authentication", async () => {
  const handler = createAuthLoginPostHandler({
    getRequestAuth: async () => ({
      user: {
        id: "user-1",
      } as never,
    }),
    getRequestAuthHelpText: () => "auth required",
    finalizeAuthLogin: async () => ({
      userId: "user-1",
      isNewUser: false,
      onboardingCompleted: true,
      profileCompleted: true,
      redirectTo: "/learn",
    }),
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/auth/login",
      JSON.stringify({ loginType: "phone" }),
      { Authorization: "Bearer token" },
    ),
  )

  assert.equal(response.status, 200)
  assert.match(response.headers.get("set-cookie") ?? "", /app-user-session=user-1/)
})

test("auth login route requires phone binding for oauth-only users", async () => {
  const handler = createAuthLoginPostHandler({
    getRequestAuth: async () => ({
      user: {
        id: "oauth-user-1",
      } as never,
    }),
    getRequestAuthHelpText: () => "auth required",
    finalizeAuthLogin: async () => {
      const error = new Error("请先绑定手机号后再继续。")
      error.name = "OAuthPhoneBindingRequiredError"
      throw error
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/auth/login",
      JSON.stringify({ loginType: "wechat" }),
      { Authorization: "Bearer oauth-token" },
    ),
  )

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "OAUTH_PHONE_BINDING_REQUIRED",
    message: "请先绑定手机号后再继续。",
    data: null,
  })
})

test("oauth temp user discard route deletes discardable oauth-only user", async () => {
  const handler = createOAuthTempUserDiscardPostHandler({
    getRequestAuth: async () => ({
      user: {
        id: "oauth-user-1",
      } as never,
    }),
    getRequestAuthHelpText: () => "auth required",
    discardOAuthTempUser: async (user, provider) => {
      assert.equal(user.id, "oauth-user-1")
      assert.equal(provider, "wechat")
      return {
        discarded: true,
        userId: "oauth-user-1",
        provider: "wechat",
      }
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/auth/oauth-temp-user/discard",
      JSON.stringify({ provider: "wechat" }),
      { Authorization: "Bearer oauth-token" },
    ),
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    code: "OK",
    message: "oauth temp user discarded",
    data: {
      discarded: true,
      userId: "oauth-user-1",
      provider: "wechat",
    },
  })
})

test("oauth temp user discard route maps non-discardable users to conflict", async () => {
  const handler = createOAuthTempUserDiscardPostHandler({
    getRequestAuth: async () => ({
      user: {
        id: "oauth-user-1",
      } as never,
    }),
    getRequestAuthHelpText: () => "auth required",
    discardOAuthTempUser: async () => {
      const error = new Error("该账号已有业务数据，不能作为临时扫码账号清理。")
      error.name = "OAuthTempUserNotDiscardableError"
      throw error
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/auth/oauth-temp-user/discard",
      JSON.stringify({ provider: "wechat" }),
      { Authorization: "Bearer oauth-token" },
    ),
  )

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "OAUTH_TEMP_USER_NOT_DISCARDABLE",
    message: "该账号已有业务数据，不能作为临时扫码账号清理。",
    data: null,
  })
})

test("auth logout route always clears the user session cookie", async () => {
  const handler = createAuthLogoutPostHandler()
  const response = await handler()

  assert.equal(response.status, 200)
  assert.match(response.headers.get("set-cookie") ?? "", /app-user-session=;/)
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/)
})
