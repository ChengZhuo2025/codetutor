"use client"

import Image from "next/image"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"
import {
  getOAuthProviderMeta,
  isOAuthProvider,
} from "@/features/auth/lib/oauth-providers"
import type { AuthLoginResponseData, ProfileMeResponseData } from "@/lib/api/contracts/auth"
import { requestData } from "@/lib/api/client"
import { isApiError } from "@/lib/api/types"
import { getOAuthRedirectOrigin } from "@/lib/auth/oauth-redirect"
import {
  clearSupabaseBrowserSession,
  createSupabaseBrowserClient,
  getSafeSupabaseBrowserSession,
} from "@/lib/supabase/client"
import { ROUTES } from "@/constants/routes"
import type { OAuthProviderProfile } from "@/features/auth/types"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
import { USER_BUTTON_PRIMARY_CLASS, USER_BUTTON_SECONDARY_CLASS } from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"

const SUBSCRIBE_INTENT_PARAM = "intent=subscribe"
type OAuthCallbackFlow = "login" | "link"

type OAuthCallbackSuccessContext = {
  flow: OAuthCallbackFlow
  provider: string
  redirectTo: string
  loginData?: AuthLoginResponseData
  onboardingCompleted?: boolean
  providerProfile: OAuthProviderProfile | null
  canNotifyParent: boolean
}

function withAuthorization(accessToken: string | null | undefined) {
  if (!accessToken) {
    return undefined
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function getHashSessionTokens() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = hashParams.get("access_token")
  const refreshToken = hashParams.get("refresh_token")

  if (!accessToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

function isLocalhostOAuthTokenLeak() {
  if (typeof window === "undefined") {
    return false
  }

  return (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && Boolean(getHashSessionTokens()?.accessToken)
  )
}

function repairLocalhostOAuthTokenRedirect() {
  if (typeof window === "undefined" || !isLocalhostOAuthTokenLeak()) {
    return false
  }

  const origin = getOAuthRedirectOrigin()
  if (!origin || origin === window.location.origin) {
    return false
  }

  const repairUrl = new URL(window.location.href)
  const targetOrigin = new URL(origin)
  repairUrl.protocol = targetOrigin.protocol
  repairUrl.host = targetOrigin.host
  window.location.replace(repairUrl.toString())
  return true
}

function notifyParentAuthCompleted(
  data: AuthLoginResponseData,
  provider: string,
  redirectTo: string,
  providerProfile: OAuthProviderProfile | null,
) {
  if (typeof window === "undefined") {
    return false
  }

  const payload = {
    type: "codetutor.oauth.completed",
    provider,
    redirectTo,
    onboardingCompleted: data.onboardingCompleted,
    providerProfile,
  }

  let notified = false

  if (window.parent !== window) {
    window.parent.postMessage(payload, window.location.origin)
    notified = true
  }

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(payload, window.location.origin)
    notified = true
  }

  return notified
}

function notifyParentOAuthBindingRequired(provider: string) {
  if (typeof window === "undefined") {
    return false
  }

  const payload = {
    type: "codetutor.oauth.binding_required",
    provider,
  }

  let notified = false

  if (window.parent !== window) {
    window.parent.postMessage(payload, window.location.origin)
    notified = true
  }

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(payload, window.location.origin)
    notified = true
  }

  return notified
}

function notifyParentOAuthLinked(provider: string, providerProfile: OAuthProviderProfile | null) {
  if (typeof window === "undefined") {
    return false
  }

  const payload = {
    type: "codetutor.oauth.linked",
    provider,
    providerProfile,
  }

  let notified = false

  if (window.parent !== window) {
    window.parent.postMessage(payload, window.location.origin)
    notified = true
  }

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(payload, window.location.origin)
    notified = true
  }

  return notified
}

function closeOpenedOAuthWindow() {
  if (typeof window === "undefined" || !window.opener || window.opener.closed) {
    return
  }

  window.setTimeout(() => {
    window.close()
  }, 350)
}

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function extractOAuthProviderProfile(user: unknown): OAuthProviderProfile | null {
  if (!user || typeof user !== "object") {
    return null
  }

  const metadata = ((user as { user_metadata?: unknown }).user_metadata ?? {}) as Record<string, unknown>
  const identityMetadata = ((user as { identities?: Array<{ identity_data?: unknown }> }).identities ?? [])
    .map((identity) => identity.identity_data)
    .find((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object")
    ?? {}
  const merged = {
    ...identityMetadata,
    ...metadata,
  }

  const nickname = readMetadataString(merged, [
    "nickname",
    "name",
    "full_name",
    "user_name",
    "preferred_username",
    "screen_name",
  ])
  const avatarUrl = readMetadataString(merged, [
    "avatar_url",
    "picture",
    "headimgurl",
    "avatar",
    "profile_image_url",
  ])

  if (!nickname && !avatarUrl) {
    return null
  }

  return {
    nickname,
    avatarUrl,
  }
}

function hasProviderProfile(profile: OAuthProviderProfile | null) {
  return Boolean(profile?.nickname || profile?.avatarUrl)
}

async function applyOAuthProfileToCurrentUser(providerProfile: OAuthProviderProfile) {
  const current = await requestData<ProfileMeResponseData>("/profile/me")
  const next = await requestData<ProfileMeResponseData>("/profile/me", {
    method: "PATCH",
    body: JSON.stringify({
      nickname: providerProfile.nickname ?? current.nickname,
      avatarUrl: providerProfile.avatarUrl ?? current.avatarUrl,
      contactEmail: current.contactEmail,
      wechat: current.wechat,
      bio: current.bio,
    }),
  })

  return next
}

function getCallbackFlow(value: string | null): OAuthCallbackFlow {
  return value === "link" ? "link" : "login"
}

function getSafeInternalRedirectTo(value: string | null) {
  if (!value?.startsWith("/")) {
    return null
  }

  if (value.startsWith("//")) {
    return null
  }

  return value
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { site } = usePublicSite()
  const siteName = site.information.siteName
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("正在完成登录状态同步。")
  const [successContext, setSuccessContext] = useState<OAuthCallbackSuccessContext | null>(null)
  const [isApplyingProfile, setIsApplyingProfile] = useState(false)

  const finishOAuthSuccess = (context = successContext) => {
    if (!context) {
      window.close()
      return
    }

    if (context.flow === "link") {
      if (context.canNotifyParent) {
        notifyParentOAuthLinked(context.provider, context.providerProfile)
        closeOpenedOAuthWindow()
        return
      }

      router.replace(context.redirectTo)
      return
    }

    if (context.canNotifyParent && context.loginData) {
      notifyParentAuthCompleted(context.loginData, context.provider, context.redirectTo, context.providerProfile)
      closeOpenedOAuthWindow()
      return
    }

    router.replace(context.redirectTo)
  }

  const handleApplyProviderProfile = async () => {
    if (!successContext?.providerProfile || !hasProviderProfile(successContext.providerProfile)) {
      finishOAuthSuccess()
      return
    }

    setIsApplyingProfile(true)

    try {
      await applyOAuthProfileToCurrentUser(successContext.providerProfile)
      finishOAuthSuccess()
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "同步昵称或头像失败，请稍后重试。")
    } finally {
      setIsApplyingProfile(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function completeAuthCallback() {
      if (repairLocalhostOAuthTokenRedirect()) {
        return
      }

      const oauthError =
        searchParams.get("error_description") ?? searchParams.get("error")

      if (oauthError) {
        setStatus("error")
        setMessage(oauthError)
        return
      }

      const providerParam = searchParams.get("provider")

      if (!isOAuthProvider(providerParam)) {
        setStatus("error")
        setMessage("缺少可识别的扫码登录 provider，无法完成登录。")
        return
      }

      const provider = providerParam
      const flow = getCallbackFlow(searchParams.get("flow"))
      const providerMeta = getOAuthProviderMeta(provider)
      const loginRedirectTo = searchParams.get("intent") === "subscribe"
        ? `${ROUTES.home}?${SUBSCRIBE_INTENT_PARAM}`
        : null

      try {
        const supabase = createSupabaseBrowserClient()
        const code = searchParams.get("code")
        let accessToken: string | null | undefined

        if (code) {
          const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            throw error
          }

          accessToken = exchangeData.session?.access_token
        } else {
          const hashTokens = getHashSessionTokens()

          if (!hashTokens) {
            setStatus("error")
            setMessage("缺少 OAuth 回调 code 或 access_token，无法完成登录。")
            return
          }

          if (hashTokens.refreshToken) {
            const { data: sessionData, error } = await supabase.auth.setSession({
              access_token: hashTokens.accessToken,
              refresh_token: hashTokens.refreshToken,
            })

            if (error) {
              throw error
            }

            accessToken = sessionData.session?.access_token
          } else {
            const session = await getSafeSupabaseBrowserSession(supabase)

            accessToken = session?.access_token ?? hashTokens.accessToken
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser(accessToken)
        const providerProfile = extractOAuthProviderProfile(user)

        if (flow === "link") {
          const canNotifyParent = typeof window !== "undefined" && Boolean(window.opener && !window.opener.closed || window.parent !== window)
          if (!cancelled && hasProviderProfile(providerProfile)) {
            setStatus("success")
            setMessage(`${providerMeta.label.replace("扫码登录", "")}账号已绑定。你可以继续使用当前资料，也可以把第三方昵称或头像同步到 ${siteName}。`)
            setSuccessContext({
              flow,
              provider,
              redirectTo: getSafeInternalRedirectTo(searchParams.get("redirectTo")) ?? ROUTES.learn,
              providerProfile,
              canNotifyParent,
            })
            return
          }

          if (!cancelled && notifyParentOAuthLinked(provider, providerProfile)) {
            setStatus("success")
            setMessage(`${providerMeta.label.replace("扫码登录", "")}账号已完成绑定，正在返回个人资料。`)
            closeOpenedOAuthWindow()
            return
          }

          if (!cancelled) {
            router.replace(getSafeInternalRedirectTo(searchParams.get("redirectTo")) ?? ROUTES.learn)
          }
          return
        }

        const data = await requestData<AuthLoginResponseData>("/auth/login", {
          method: "POST",
          headers: withAuthorization(accessToken),
          body: JSON.stringify({
            loginType: provider,
          }),
        })

        const redirectTo = loginRedirectTo ?? data.redirectTo

        const canNotifyParent = typeof window !== "undefined" && Boolean(window.opener && !window.opener.closed || window.parent !== window)
        if (!cancelled && hasProviderProfile(providerProfile)) {
          setStatus("success")
          setMessage(`欢迎回来，正在进入 ${siteName}。你也可以先使用 ${providerMeta.label.replace("扫码登录", "")} 的昵称或头像更新资料。`)
          setSuccessContext({
            flow,
            provider,
            redirectTo,
            loginData: data,
            onboardingCompleted: data.onboardingCompleted,
            providerProfile,
            canNotifyParent,
          })
          return
        }

        if (!cancelled && notifyParentAuthCompleted(data, provider, redirectTo, providerProfile)) {
          setStatus("success")
          setMessage(`欢迎回来，正在进入 ${siteName}。`)
          closeOpenedOAuthWindow()
          return
        }

        if (!cancelled) {
          router.replace(redirectTo)
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : `${providerMeta.label}回调处理失败`

        if (
          flow === "login"
          && (
            (isApiError(error) && error.code === "OAUTH_PHONE_BINDING_REQUIRED")
            || message.includes("绑定手机号")
          )
        ) {
          try {
            const supabase = createSupabaseBrowserClient()
            const session = await getSafeSupabaseBrowserSession(supabase)

            await requestData("/auth/oauth-temp-user/discard", {
              method: "POST",
              headers: withAuthorization(session?.access_token),
              body: JSON.stringify({ provider }),
            }).catch(() => undefined)
            await clearSupabaseBrowserSession(supabase)
          } finally {
            if (!cancelled && notifyParentOAuthBindingRequired(provider)) {
              setStatus("success")
              setMessage("请返回登录页绑定手机号。")
              closeOpenedOAuthWindow()
              return
            }
          }
        }

        if (flow === "login") {
          const supabase = createSupabaseBrowserClient()
          await clearSupabaseBrowserSession(supabase)
        }
        setStatus("error")
        setMessage(message)
      }
    }

    void completeAuthCallback()

    return () => {
      cancelled = true
    }
  }, [router, searchParams, siteName])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg">
        <StatePanel
          status={status}
          title={status === "loading" ? "正在完成登录" : status === "success" ? "处理完成" : "登录失败"}
          description={message}
          extra={status === "success" && hasProviderProfile(successContext?.providerProfile ?? null) ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/55 p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dim text-sm font-bold text-brand">
                  {successContext?.providerProfile?.avatarUrl ? (
                    <Image
                      src={successContext.providerProfile.avatarUrl}
                      alt={successContext.providerProfile.nickname ?? "第三方头像"}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    successContext?.providerProfile?.nickname?.slice(0, 1) ?? "你"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {successContext?.providerProfile?.nickname ?? "第三方头像"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getOAuthProviderMeta((successContext?.provider ?? "wechat") as never).label.replace("扫码登录", "")}资料
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={handleApplyProviderProfile}
                  disabled={isApplyingProfile}
                  className={cn("h-10", USER_BUTTON_PRIMARY_CLASS)}
                >
                  {isApplyingProfile ? "同步中..." : "使用昵称或头像"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => finishOAuthSuccess()}
                  disabled={isApplyingProfile}
                  className={cn("h-10", USER_BUTTON_SECONDARY_CLASS)}
                >
                  暂不使用，继续
                </Button>
              </div>
            </div>
          ) : undefined}
          actionLabel={status === "success" && !hasProviderProfile(successContext?.providerProfile ?? null) ? "关闭窗口" : undefined}
          onAction={status === "success" && !hasProviderProfile(successContext?.providerProfile ?? null) ? () => window.close() : undefined}
        />
      </div>
    </div>
  )
}

function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg">
        <StatePanel
          status="loading"
          title="正在完成登录"
          description="正在初始化回调页。"
        />
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
