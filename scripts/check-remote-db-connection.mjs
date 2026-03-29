import { spawn } from "node:child_process"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"
import { getDatabaseConfig } from "./lib/db-env.mjs"

function runPsqlCheck(config) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "psql",
      [
        "-v",
        "ON_ERROR_STOP=1",
        "-t",
        "-A",
        "-c",
        "select current_database(), current_user, count(*)::int from public.learning_tools;",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PGHOST: config.host,
          PGPORT: config.port,
          PGDATABASE: config.database,
          PGUSER: config.user,
          PGPASSWORD: config.password,
          PGSSLMODE: config.sslmode,
          PGCONNECT_TIMEOUT: "8",
        },
      },
    )

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    const timeout = setTimeout(() => {
      child.kill("SIGTERM")
      reject(new Error("psql connection timed out after 8 seconds"))
    }, 8000)

    child.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(timeout)

      if (code !== 0) {
        reject(new Error(stderr.trim() || `psql exited with code ${code}`))
        return
      }

      resolve(stdout.trim())
    })
  })
}

async function runSupabaseApiCheck(config) {
  const client = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const { data, error } = await client
    .from("learning_tools")
    .select("code")
    .abortSignal(AbortSignal.timeout(8000))
    .limit(3)

  if (error) {
    throw new Error(error.message)
  }

  return data?.map((row) => row.code) ?? []
}

async function main() {
  const config = getDatabaseConfig()

  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabaseServiceRoleKey],
    ["DATABASE_HOST", config.host],
    ["DATABASE_USER", config.user],
    ["DATABASE_PASSWORD", config.password],
  ].filter(([, value]) => !value)

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.map(([key]) => key).join(", ")}`,
    )
  }

  const [apiCodes, psqlRow] = await Promise.all([
    runSupabaseApiCheck(config),
    runPsqlCheck(config),
  ])

  const [databaseName, currentUser, learningToolsCount] = psqlRow.split("|")

  console.log(
    JSON.stringify({
      ok: true,
      api: {
        sampleCodes: apiCodes,
      },
      postgres: {
        database: databaseName,
        user: currentUser,
        learningToolsCount: Number(learningToolsCount),
        sslmode: config.sslmode,
      },
    }),
  )
}

main().catch((error) => {
  console.error(`DB_CHECK_FAILED: ${error.message}`)
  process.exit(1)
})
