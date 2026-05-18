export const PROFILE_AVATAR_BUCKET = "avatars"
export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const PROFILE_AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export const QR_CODE_BUCKET = "qr-codes"
export const QR_CODE_MAX_BYTES = 2 * 1024 * 1024
export const QR_CODE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const

export const SITE_ASSET_BUCKET = "site-assets"
export const SITE_LOGO_MAX_BYTES = 2 * 1024 * 1024
export const SITE_LOGO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] as const

export const LEARNING_CHAT_ATTACHMENT_BUCKET = "learning-chat-attachments"
export const LEARNING_CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const LEARNING_CHAT_AUDIO_MAX_BYTES = 15 * 1024 * 1024
export const LEARNING_CHAT_AUDIO_MAX_DURATION_MS = 60_000
export const LEARNING_CHAT_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const
export const LEARNING_CHAT_AUDIO_ALLOWED_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
] as const

export function getAvatarStoragePrefix(userId: string) {
  return `${userId}/`
}

export function getLearningChatAttachmentStoragePrefix(userId: string, date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${userId}/${year}/${month}/`
}

export function getAvatarStoragePathFromUrl(url: string | null | undefined, userId: string) {
  if (!url) {
    return null
  }

  const prefix = `/${PROFILE_AVATAR_BUCKET}/`
  const markerIndex = url.indexOf(prefix)

  if (markerIndex === -1) {
    return null
  }

  const objectPath = url.slice(markerIndex + prefix.length)

  if (!objectPath.startsWith(getAvatarStoragePrefix(userId))) {
    return null
  }

  return objectPath
}
