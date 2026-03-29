type PublicSupabaseEnv = {
  url: string
  anonKey: string
}

type ServerSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string
}

function requiredPublicEnv(
  key: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
): string {
  const value =
    key === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

function requiredServerEnv(key: "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return {
    url: requiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  }
}

export function getServerSupabaseEnv(): ServerSupabaseEnv {
  return {
    ...getPublicSupabaseEnv(),
    serviceRoleKey: requiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }
}
