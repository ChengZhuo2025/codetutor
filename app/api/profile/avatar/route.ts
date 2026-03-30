import type { NextRequest } from "next/server"
import type { UploadProfileAvatarResponseData } from "@/lib/api/contracts/auth"
import {
  PROFILE_AVATAR_ALLOWED_TYPES,
  PROFILE_AVATAR_BUCKET,
  PROFILE_AVATAR_MAX_BYTES,
  getAvatarStoragePrefix,
} from "@/lib/supabase/storage"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { fail, ok } from "@/server/lib/api-response"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

function getFileExtension(file: File) {
  const filename = file.name.trim()
  const extension = filename.includes(".") ? filename.split(".").pop() : null

  if (extension && /^[a-zA-Z0-9]+$/.test(extension)) {
    return extension.toLowerCase()
  }

  if (file.type === "image/png") {
    return "png"
  }

  if (file.type === "image/webp") {
    return "webp"
  }

  return "jpg"
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request)

    if (!auth) {
      return fail("AUTH_REQUIRED", getRequestAuthHelpText(), 401)
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return fail("BAD_REQUEST", "请先选择要上传的头像图片。", 400)
    }

    if (!PROFILE_AVATAR_ALLOWED_TYPES.includes(file.type as (typeof PROFILE_AVATAR_ALLOWED_TYPES)[number])) {
      return fail("VALIDATION_FAILED", "头像仅支持 JPG、PNG、WebP 格式。", 400)
    }

    if (file.size <= 0) {
      return fail("VALIDATION_FAILED", "头像文件为空，请重新选择。", 400)
    }

    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      return fail("VALIDATION_FAILED", "头像图片不能超过 2MB。", 400)
    }

    const bytes = await file.arrayBuffer()
    const supabase = createSupabaseAdminClient()
    const extension = getFileExtension(file)
    const objectPath = `${getAvatarStoragePrefix(auth.userId)}${Date.now()}-${crypto.randomUUID()}.${extension}`
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("avatar_url")
      .eq("user_id", auth.userId)
      .maybeSingle()

    assertSupabaseSuccess(profileError, "failed to query existing avatar before upload")

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_AVATAR_BUCKET)
      .upload(objectPath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    assertSupabaseSuccess(uploadError, "failed to upload profile avatar")

    const {
      data: { publicUrl },
    } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(objectPath)

    const data: UploadProfileAvatarResponseData = {
      avatarUrl: publicUrl,
      storagePath: objectPath,
      previousAvatarUrl:
        typeof (profile as { avatar_url?: unknown } | null)?.avatar_url === "string"
          ? ((profile as { avatar_url?: string | null }).avatar_url ?? null)
          : null,
    }

    return ok(data, "avatar uploaded")
  } catch (error) {
    return fail(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "头像上传失败",
      500,
    )
  }
}
