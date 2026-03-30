import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const PROJECT_ROOT = process.cwd()
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs"]

function resolveProjectSpecifier(specifier) {
  const relativePath = specifier.slice(2)
  const basePath = path.resolve(PROJECT_ROOT, relativePath)

  for (const extension of EXTENSIONS) {
    const candidatePath = `${basePath}${extension}`

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return pathToFileURL(candidatePath).href
    }
  }

  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolvedUrl = resolveProjectSpecifier(specifier)

    if (!resolvedUrl) {
      throw new Error(`Alias loader failed to resolve specifier: ${specifier}`)
    }

    return nextResolve(resolvedUrl, context)
  }

  return nextResolve(specifier, context)
}
