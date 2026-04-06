import { createHash } from "node:crypto"

type HeaderReader = {
  headers: Pick<Headers, "get">
}

export function getBearerTokenFromHeaders(headers: Pick<Headers, "get">) {
  const authorization = headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.slice("Bearer ".length).trim()
  return token || null
}

export function hashSensitiveValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function getClientIp(request: HeaderReader) {
  const xForwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (xForwardedFor) {
    return xForwardedFor
  }

  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) {
    return realIp
  }

  const cfIp = request.headers.get("cf-connecting-ip")?.trim()
  if (cfIp) {
    return cfIp
  }

  return "unknown"
}
