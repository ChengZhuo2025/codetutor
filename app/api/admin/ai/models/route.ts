import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { jsonError } from "@/server/lib/route-response"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import {
  createAdminAIModelDetailHandlers,
  createAdminAIModelListHandler,
} from "@/server/modules/admin-ai/route-handler"
import {
  createAdminAIModel,
  getAdminAIModelDetail,
  getAdminAIModelList,
  updateAdminAIModel,
} from "@/server/modules/admin-ai/service"

const listHandlers = createAdminAIModelListHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIModelList,
  createAdminAIModel,
})

const detailHandlers = createAdminAIModelDetailHandlers({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminAIModelDetail,
  updateAdminAIModel,
})

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const qModelId = url.searchParams.get("modelId")?.trim()
  if (qModelId) {
    return withNoStoreHeaders(
      await detailHandlers.GET(request, { params: Promise.resolve({ modelId: qModelId }) }),
    )
  }
  return withNoStoreHeaders(await listHandlers.GET(request))
}

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await listHandlers.POST(request))
}

export async function PATCH(request: NextRequest) {
  const url = new URL(request.url)
  const qModelId = url.searchParams.get("modelId")?.trim()
  if (!qModelId) {
    return withNoStoreHeaders(jsonError("BAD_REQUEST", "缺少查询参数 modelId。", 400))
  }
  return withNoStoreHeaders(
    await detailHandlers.PATCH(request, { params: Promise.resolve({ modelId: qModelId }) }),
  )
}
