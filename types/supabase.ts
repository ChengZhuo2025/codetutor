export interface SupabaseEnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export type SupabaseClientType = ReturnType<typeof import("@supabase/supabase-js").createClient>
