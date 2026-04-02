import "server-only"

import { createClient } from "@supabase/supabase-js"

import { getPublicSupabaseEnv } from "./env.ts"

/** 用于服务端校验用户当前密码（signInWithPassword），不持久化会话。 */
export function createSupabaseAnonServerClient() {
  const { url, anonKey } = getPublicSupabaseEnv()

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
