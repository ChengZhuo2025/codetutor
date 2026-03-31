import { readFile } from "node:fs/promises"
import { join } from "node:path"

const swaggerUiBundlePath = join(
  process.cwd(),
  "node_modules",
  "swagger-ui-react",
  "swagger-ui-bundle.js",
)

export async function GET() {
  const source = await readFile(swaggerUiBundlePath, "utf8")

  return new Response(source, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
