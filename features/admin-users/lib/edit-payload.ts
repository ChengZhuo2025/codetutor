import type { AdminUpdateUserRequest, AdminUserListItem } from "@/lib/api/contracts/admin-users"

type EditableAdminUserForm = {
  nickname: string
  bio: string
  contactEmail: string
  wechat: string
}

type BuildAdminUserPatchPayloadInput = {
  user: AdminUserListItem
  form: EditableAdminUserForm
}

function normalizeRequiredString(value: string) {
  return value.trim()
}

function normalizeOptionalString(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function buildAdminUserPatchPayload(
  input: BuildAdminUserPatchPayloadInput,
): AdminUpdateUserRequest {
  const payload: AdminUpdateUserRequest = {}

  const nickname = normalizeRequiredString(input.form.nickname)
  if (nickname !== (input.user.nickname ?? "")) {
    payload.nickname = nickname
  }

  const bio = normalizeOptionalString(input.form.bio)
  if (bio !== (input.user.bio ?? null)) {
    payload.bio = bio
  }

  const contactEmail = normalizeOptionalString(input.form.contactEmail)
  if (contactEmail !== (input.user.contactEmail ?? null)) {
    payload.contactEmail = contactEmail
  }

  const wechat = normalizeOptionalString(input.form.wechat)
  if (wechat !== (input.user.wechat ?? null)) {
    payload.wechat = wechat
  }

  return payload
}
