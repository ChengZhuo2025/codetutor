import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  USER_SESSION_COOKIE,
} from "@/constants/auth-cookies"
import {
  ADMIN_ROUTES,
  ROUTES,
  USER_PROTECTED_ROUTES,
} from "@/constants/routes"

const USER_PROTECTED_ROUTE_SET = new Set<string>(USER_PROTECTED_ROUTES)

function normalizePathname(pathname: string) {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1)
  }

  return pathname
}

export function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname)
  const hasAdminSession = request.cookies.has(ADMIN_ACCESS_TOKEN_COOKIE)
  const hasUserSession = request.cookies.has(USER_SESSION_COOKIE)

  if (
    pathname.startsWith(ADMIN_ROUTES.home) &&
    pathname !== ADMIN_ROUTES.login &&
    !hasAdminSession
  ) {
    return NextResponse.redirect(new URL(ADMIN_ROUTES.login, request.url))
  }

  if (USER_PROTECTED_ROUTE_SET.has(pathname) && !hasUserSession) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/onboarding", "/learn", "/map", "/history", "/achievements"],
}
