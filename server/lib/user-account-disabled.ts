/** Thrown when a user profile is soft-deleted; map to 403 USER_ACCOUNT_DISABLED in route handlers. */
export class UserAccountDisabledError extends Error {
  readonly code = "USER_ACCOUNT_DISABLED" as const

  constructor(message = "该账号已被停用，如有疑问请联系客服。") {
    super(message)
    this.name = "UserAccountDisabledError"
  }
}

export function isUserAccountDisabledError(error: unknown): error is UserAccountDisabledError {
  return error instanceof UserAccountDisabledError
}
