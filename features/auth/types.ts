export type AuthStep = "idle" | "oauth-binding"
export type AuthOAuthProvider = "wechat" | "douyin"

export type OAuthProviderProfile = {
  nickname: string | null
  avatarUrl: string | null
}

export type AuthPreviewStep = {
  id: number
  title: string
  description: string
  active: boolean
}
