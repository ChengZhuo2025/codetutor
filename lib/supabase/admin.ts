import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getServerSupabaseEnv } from "./env.ts"

export function createSupabaseAdminClient(): SupabaseClient {
  const { url, serviceRoleKey } = getServerSupabaseEnv()

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
