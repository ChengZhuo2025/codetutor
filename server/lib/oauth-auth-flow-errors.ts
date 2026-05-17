export class OAuthPhoneBindingRequiredError extends Error {
  readonly code = "OAUTH_PHONE_BINDING_REQUIRED" as const

  constructor(message = "请先绑定手机号后再继续。") {
    super(message)
    this.name = "OAuthPhoneBindingRequiredError"
  }
}

export function isOAuthPhoneBindingRequiredError(
  error: unknown,
): error is OAuthPhoneBindingRequiredError {
  return (
    error instanceof OAuthPhoneBindingRequiredError
    || (
      error instanceof Error
      && (
        error.name === "OAuthPhoneBindingRequiredError"
        || (error as { code?: unknown }).code === "OAUTH_PHONE_BINDING_REQUIRED"
      )
    )
  )
}

export class OAuthTempUserNotDiscardableError extends Error {
  readonly code = "OAUTH_TEMP_USER_NOT_DISCARDABLE" as const

  constructor(message = "该账号已有业务数据，不能作为临时扫码账号清理。") {
    super(message)
    this.name = "OAuthTempUserNotDiscardableError"
  }
}

export function isOAuthTempUserNotDiscardableError(
  error: unknown,
): error is OAuthTempUserNotDiscardableError {
  return (
    error instanceof OAuthTempUserNotDiscardableError
    || (
      error instanceof Error
      && (
        error.name === "OAuthTempUserNotDiscardableError"
        || (error as { code?: unknown }).code === "OAUTH_TEMP_USER_NOT_DISCARDABLE"
      )
    )
  )
}
