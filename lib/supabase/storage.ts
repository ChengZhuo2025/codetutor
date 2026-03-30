export const PROFILE_AVATAR_BUCKET = "avatars"
export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const PROFILE_AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export function getAvatarStoragePrefix(userId: string) {
  return `${userId}/`
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
