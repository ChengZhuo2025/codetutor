import test from "node:test"
import assert from "node:assert/strict"

import {
  getSupabaseBrowserClientAuthOptions,
  getSafeSupabaseBrowserSession,
  isInvalidSupabaseRefreshTokenError,
} from "../lib/supabase/client.ts"

test("browser Supabase client defers refresh errors to safe session reads", () => {
  assert.equal(getSupabaseBrowserClientAuthOptions().autoRefreshToken, false)
  assert.equal(getSupabaseBrowserClientAuthOptions().persistSession, true)
  assert.equal(getSupabaseBrowserClientAuthOptions().detectSessionInUrl, true)
})

test("invalid Supabase refresh token errors are treated as expired browser sessions", async () => {
  const error = Object.assign(
    new Error("Invalid Refresh Token: Refresh Token Not Found"),
    {
      name: "AuthApiError",
      status: 400,
      code: "refresh_token_not_found",
    },
  )

  let signOutScope: string | undefined
  const session = await getSafeSupabaseBrowserSession({
    auth: {
      getSession: async () => {
        throw error
      },
      signOut: async (options?: { scope?: string }) => {
        signOutScope = options?.scope
        return { error: null }
      },
    },
  })

  assert.equal(isInvalidSupabaseRefreshTokenError(error), true)
  assert.equal(session, null)
  assert.equal(signOutScope, "local")
})

test("unexpected Supabase session errors are not swallowed", async () => {
  const error = new Error("network offline")

  await assert.rejects(
    () =>
      getSafeSupabaseBrowserSession({
        auth: {
          getSession: async () => {
            throw error
          },
          signOut: async () => ({ error: null }),
        },
      }),
    error,
  )
})
