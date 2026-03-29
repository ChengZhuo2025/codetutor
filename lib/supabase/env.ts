type PublicSupabaseEnv = {
  url: string
  anonKey: string
}

type ServerSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string
}

function requiredEnv(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return {
    url: requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  }
}

export function getServerSupabaseEnv(): ServerSupabaseEnv {
  return {
    ...getPublicSupabaseEnv(),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }
}
