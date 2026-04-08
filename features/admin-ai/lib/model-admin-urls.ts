/** BFF：单条 Model 读写走列表路由 + query，避免部分环境下 `/models/[modelId]` 未命中返回 HTML 404。 */
export function adminAiModelBffDetailUrl(modelId: string) {
  const params = new URLSearchParams()
  params.set("modelId", modelId)
  return `/admin/ai/models?${params.toString()}`
}

export function adminAiModelPageDetailUrl(modelId: string) {
  const params = new URLSearchParams()
  params.set("modelId", modelId)
  return `/admin/ai/models/detail?${params.toString()}`
}
