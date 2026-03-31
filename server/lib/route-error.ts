import { jsonError } from "./route-response.ts"

export type RouteErrorRule = {
  code: string
  status: number
  name?: string
  messageIncludes?: string[]
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

export function jsonInternalErrorFromError(error: unknown, fallbackMessage: string) {
  return jsonError("INTERNAL_ERROR", getErrorMessage(error, fallbackMessage), 500)
}

function matchesRouteErrorRule(error: Error, rule: RouteErrorRule) {
  if (rule.name && error.name === rule.name) {
    return true
  }

  if (
    rule.messageIncludes
    && rule.messageIncludes.some((fragment) => error.message.includes(fragment))
  ) {
    return true
  }

  return false
}

export function mapRouteError(
  error: unknown,
  fallbackMessage: string,
  rules: RouteErrorRule[],
) {
  if (error instanceof Error) {
    for (const rule of rules) {
      if (matchesRouteErrorRule(error, rule)) {
        return jsonError(rule.code, error.message, rule.status)
      }
    }
  }

  return jsonInternalErrorFromError(error, fallbackMessage)
}
