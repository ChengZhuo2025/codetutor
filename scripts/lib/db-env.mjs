import fs from "node:fs"
import path from "node:path"

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

export function loadEnvFile(filePath = path.resolve(process.cwd(), ".env")) {
  const raw = fs.readFileSync(filePath, "utf8")
  const env = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")

    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = stripQuotes(trimmed.slice(separatorIndex + 1))
    env[key] = value
  }

  return env
}

function parseDatabaseUrl(databaseUrl) {
  const match =
    databaseUrl.match(
      /^postgres(?:ql)?:\/\/(?<user>[^:]+):(?<password>.+)@(?<host>[^:/?#]+)(?::(?<port>\d+))?\/(?<database>[^?]+)/,
    ) ?? null

  if (!match?.groups) {
    return null
  }

  return {
    user: decodeURIComponent(match.groups.user),
    password: decodeURIComponent(match.groups.password),
    host: match.groups.host,
    port: match.groups.port ?? "5432",
    database: decodeURIComponent(match.groups.database),
  }
}

export function getDatabaseConfig(filePath) {
  const env = loadEnvFile(filePath)
  const parsedUrl = env.DATABASE_URL ? parseDatabaseUrl(env.DATABASE_URL) : null

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    host: env.DATABASE_HOST ?? parsedUrl?.host ?? "",
    port: env.DATABASE_PORT ?? parsedUrl?.port ?? "5432",
    database: env.DATABASE_NAME ?? parsedUrl?.database ?? "postgres",
    user: env.DATABASE_USER ?? parsedUrl?.user ?? "postgres",
    password: env.DATABASE_PASSWORD ?? parsedUrl?.password ?? "",
    sslmode: env.DATABASE_SSLMODE ?? "require",
  }
}
