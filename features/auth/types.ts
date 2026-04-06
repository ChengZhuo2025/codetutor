export type AuthMode = "login" | "register"
export type AuthOAuthProvider = "wechat" | "douyin"

export type AuthPreviewStep = {
  id: number
  title: string
  description: string
  active: boolean
}
