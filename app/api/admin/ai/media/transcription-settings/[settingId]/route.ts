import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminAIMediaTranscriptionSettingDetailPatchHandler } from "@/server/modules/admin-ai/route-handler"
import { updateAdminAIMediaTranscriptionSetting } from "@/server/modules/admin-ai/media-service"

export const PATCH = createAdminAIMediaTranscriptionSettingDetailPatchHandler({
  getRequestAdmin,
  updateAdminAIMediaTranscriptionSetting,
})
