import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminAIMediaAttachmentListGetHandler } from "@/server/modules/admin-ai/route-handler"
import { getAdminAIMediaAttachments } from "@/server/modules/admin-ai/media-service"

export const GET = createAdminAIMediaAttachmentListGetHandler({
  getRequestAdmin,
  getAdminAIMediaAttachments,
})
