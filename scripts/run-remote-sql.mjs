import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import process from "node:process"
import { getDatabaseConfig } from "./lib/db-env.mjs"

function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--")
  const sqlFile = args[0]

  if (!sqlFile) {
    console.error("Usage: pnpm db:run:file -- <sql-file>")
    process.exit(1)
  }

  const resolvedFile = path.resolve(process.cwd(), sqlFile)

  if (!fs.existsSync(resolvedFile)) {
    console.error(`SQL file not found: ${resolvedFile}`)
    process.exit(1)
  }

  const config = getDatabaseConfig()

  if (!config.host || !config.user || !config.password) {
    console.error(
      "Missing database connection settings. Check DATABASE_HOST / DATABASE_USER / DATABASE_PASSWORD in .env.",
    )
    process.exit(1)
  }

  const child = spawn(
    "psql",
    ["-v", "ON_ERROR_STOP=1", "-f", resolvedFile],
    {
      stdio: "inherit",
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

  child.on("error", (error) => {
    console.error(`Failed to start psql: ${error.message}`)
    process.exit(1)
  })

  child.on("close", (code) => {
    process.exit(code ?? 1)
  })
}

main()
