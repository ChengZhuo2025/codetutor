import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"

export const PROFILE_UPDATED_EVENT = "profile-updated"

export function dispatchProfileUpdated(profile: ProfileMeResponseData) {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent<ProfileMeResponseData>(PROFILE_UPDATED_EVENT, {
      detail: profile,
    }),
  )
}
