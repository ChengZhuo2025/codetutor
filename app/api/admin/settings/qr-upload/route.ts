import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { createQrCodeUploadPostHandler } from "@/server/modules/admin-settings/route-handler"
import { uploadQrCodeImage } from "@/server/modules/admin-settings/service"

const postHandler = createQrCodeUploadPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  uploadQrCodeImage,
})

export async function POST(request: NextRequest) {
  return withNoStoreHeaders(await postHandler(request))
}
