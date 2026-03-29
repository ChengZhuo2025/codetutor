import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getPublicSupabaseEnv } from "./env"

let browserClient: SupabaseClient | undefined

export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient
  }

  const { url, anonKey } = getPublicSupabaseEnv()

  browserClient = createClient(url, anonKey)

  return browserClient
}
