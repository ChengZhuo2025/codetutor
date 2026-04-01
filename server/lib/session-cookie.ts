import { SESSION_COOKIE_MAX_AGE_SECONDS } from "@/constants/auth-cookies"

export function buildSessionCookieHeader(
  name: string,
  value: string,
  maxAgeSeconds = SESSION_COOKIE_MAX_AGE_SECONDS,
) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ]

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure")
  }

  return parts.join("; ")
}
