import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminAIMediaTranscriptionSettingListGetHandler } from "@/server/modules/admin-ai/route-handler"
import { getAdminAIMediaTranscriptionSettings } from "@/server/modules/admin-ai/media-service"

export const GET = createAdminAIMediaTranscriptionSettingListGetHandler({
  getRequestAdmin,
  getAdminAIMediaTranscriptionSettings,
})
