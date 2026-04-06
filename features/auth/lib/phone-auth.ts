export type PhoneAuthAction = "send" | "verify" | "oauth"

export function normalizePhoneInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "")

  if (/^86\d{11}$/.test(digitsOnly)) {
    return digitsOnly.slice(2, 13)
  }

  return digitsOnly.slice(0, 11)
}

export function isValidChinaMainlandPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone)
}

export function toFriendlyAuthError(
  error: unknown,
  action: PhoneAuthAction,
) {
  const fallback =
    action === "send"
      ? "验证码发送失败，请稍后重试。"
      : action === "verify"
        ? "登录失败，请检查验证码后重试。"
        : "微信登录跳转失败，请稍后重试。"

  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message.toLowerCase()

  if (message.includes("otp_expired") || message.includes("token has expired")) {
    return "验证码已失效或不正确，请重新获取后再试。"
  }

  if (message.includes("request_timeout")) {
    return "短信服务响应超时，请稍后再试。若多次失败，可先使用测试验证码或检查短信通道配置。"
  }

  if (message.includes("invalid phone") || message.includes("phone_number_invalid")) {
    return "手机号格式不正确，请输入真实的 11 位中国大陆手机号。"
  }

  if (
    message.includes("rate limit")
    || message.includes("over_sms_send_rate_limit")
    || message.includes("too many requests")
  ) {
    return "发送过于频繁，请稍后再试。"
  }

  if (message.includes("sms provider") || message.includes("sms")) {
    return "短信发送失败，请检查短信模板、签名和服务商配置。"
  }

  if (
    action === "oauth"
    && (
      message.includes("provider is not enabled")
      || message.includes("unsupported provider")
      || message.includes("oauth")
    )
  ) {
    return "该扫码登录方式暂未开放，请先启用对应的登录 Provider。"
  }

  if (action === "oauth" && (message.includes("access_denied") || message.includes("cancel"))) {
    return "你已取消扫码授权，可重新发起登录。"
  }

  if (message.includes("network")) {
    return "网络连接异常，请稍后重试。"
  }

  return error.message || fallback
}
