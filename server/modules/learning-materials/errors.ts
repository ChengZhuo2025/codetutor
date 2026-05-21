import "server-only"

export class MaterialPlanError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(code: string, message: string, httpStatus: number) {
    super(message)
    this.name = "MaterialPlanError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function materialUnsupportedSource(
  message = "当前仅支持 developer.mozilla.org、nextjs.org、web.dev，以及公开的抖音、小红书、B 站教程链接。",
) {
  return new MaterialPlanError("MATERIAL_UNSUPPORTED_SOURCE", message, 422)
}

export function materialFetchFailed(message = "链接抓取失败或超时，请稍后重试。") {
  return new MaterialPlanError("MATERIAL_FETCH_FAILED", message, 422)
}

export function materialInsufficientContent(message = "页面有效内容不足，无法生成稳定计划，请换一篇教程或补充摘要。") {
  return new MaterialPlanError("MATERIAL_INSUFFICIENT_CONTENT", message, 422)
}
