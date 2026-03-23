export type AuthTab = "phone" | "wechat"

export type AuthMode = "login" | "register"

export type AuthPreviewStep = {
  id: number
  title: string
  description: string
  active?: boolean
}
