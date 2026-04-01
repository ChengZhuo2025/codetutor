import test from "node:test"
import assert from "node:assert/strict"

import {
  createAuthLoginPostHandler,
  createAuthLogoutPostHandler,
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

test("auth logout route always clears the user session cookie", async () => {
  const handler = createAuthLogoutPostHandler()
  const response = await handler()

  assert.equal(response.status, 200)
  assert.match(response.headers.get("set-cookie") ?? "", /app-user-session=;/)
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/)
})
