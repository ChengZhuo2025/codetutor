"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Camera, CheckCircle2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type {
  ProfileMeResponseData,
  UploadProfileAvatarResponseData,
  UpdateProfileMeRequest,
} from "@/lib/api/contracts/auth"
import { requestData } from "@/lib/api/client"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  OAUTH_PROVIDERS,
  getOAuthProviderMeta,
} from "@/features/auth/lib/oauth-providers"
import type { AuthOAuthProvider, OAuthProviderProfile } from "@/features/auth/types"
import {
  PROFILE_AVATAR_ALLOWED_TYPES,
  PROFILE_AVATAR_BUCKET,
  PROFILE_AVATAR_MAX_BYTES,
  getAvatarStoragePathFromUrl,
} from "@/lib/supabase/storage"
import { dispatchProfileUpdated } from "@/lib/profile/events"
import {
  DIALOG_PANEL_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_FIELD_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
  USER_PANEL_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"

type ProfileEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (profile: ProfileMeResponseData) => void
}

type ProfileFormState = {
  avatarUrl: string
  nickname: string
  phone: string
  wechat: string
  email: string
  bio: string
}

type OAuthLinkedMessage = {
  type: "codetutor.oauth.linked"
  provider?: AuthOAuthProvider
  providerProfile?: OAuthProviderProfile | null
}

const OAUTH_POPUP_FEATURES = "width=820,height=720,scrollbars=yes,resizable=yes"

const INITIAL_FORM: ProfileFormState = {
  avatarUrl: "",
  nickname: "",
  phone: "",
  wechat: "",
  email: "",
  bio: "",
}

function normalizeOptionalString(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toFormState(profile: ProfileMeResponseData): ProfileFormState {
  return {
    avatarUrl: profile.avatarUrl ?? "",
    nickname: profile.nickname ?? "",
    phone: profile.phone ?? "",
    wechat: profile.wechat ?? "",
    email: profile.email ?? "",
    bio: profile.bio ?? "",
  }
}

function isLinkedMessage(value: unknown): value is OAuthLinkedMessage {
  return (
    Boolean(value)
    && typeof value === "object"
    && (value as { type?: unknown }).type === "codetutor.oauth.linked"
  )
}

function openOAuthLinkPopup(url?: string) {
  const popup = window.open(url ?? "about:blank", "oauth_link_popup", OAUTH_POPUP_FEATURES)

  if (popup && !popup.closed) {
    popup.focus()
  }

  return popup
}

function validateProfileForm(form: ProfileFormState) {
  const nickname = form.nickname.trim()

  if (nickname.length < 2) {
    return "昵称至少需要 2 个字符。"
  }

  if (nickname.length > 24) {
    return "昵称最多 24 个字符。"
  }

  if (form.wechat.trim().length > 64) {
    return "微信号最多 64 个字符。"
  }

  if (form.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "邮箱格式不正确，请检查后重试。"
  }

  if (form.bio.trim().length > 300) {
    return "个人简介最多 300 个字符。"
  }

  return null
}

export function ProfileEditDialog({ open, onOpenChange, onSaved }: ProfileEditDialogProps) {
  const [profile, setProfile] = useState<ProfileFormState>(INITIAL_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [linkedProviders, setLinkedProviders] = useState<Set<string>>(new Set())
  const [activeLinkProvider, setActiveLinkProvider] = useState<AuthOAuthProvider | null>(null)
  const [uploadedAvatarPreviousUrl, setUploadedAvatarPreviousUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  const loadProfileData = useCallback(async () => {
    const data = await requestData<ProfileMeResponseData>("/profile/me")
    setProfile(toFormState(data))
    return data
  }, [])

  useEffect(() => {
    if (!open) {
      setErrorMessage(null)
      setSuccessMessage(null)
      setUploadedAvatarPreviousUrl(null)
      return
    }

    let cancelled = false

    async function loadProfile() {
      setIsLoading(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      try {
        await loadProfileData()

        if (cancelled) {
          return
        }

      } catch (error) {
        if (cancelled) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : "加载个人资料失败，请稍后重试。")
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [loadProfileData, open])

  const loadIdentities = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.getUserIdentities()

    if (error) {
      throw error
    }

    setLinkedProviders(new Set((data.identities ?? []).map((identity) => identity.provider)))
  }, [])

  useEffect(() => {
    if (!open) {
      setLinkedProviders(new Set())
      setActiveLinkProvider(null)
      return
    }

    let cancelled = false

    async function loadLinkedProviders() {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data, error } = await supabase.auth.getUserIdentities()

        if (error) {
          throw error
        }

        if (!cancelled) {
          setLinkedProviders(new Set((data.identities ?? []).map((identity) => identity.provider)))
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "加载登录方式失败，请稍后重试。")
        }
      }
    }

    void loadLinkedProviders()

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    function handleOAuthLinked(event: MessageEvent) {
      if (event.origin !== window.location.origin || !isLinkedMessage(event.data)) {
        return
      }

      setActiveLinkProvider(null)
      void loadIdentities()
      void (async () => {
        const data = await loadProfileData()
        dispatchProfileUpdated(data)
        onSaved?.(data)
      })()
      setSuccessMessage(
        event.data.providerProfile?.nickname || event.data.providerProfile?.avatarUrl
          ? "账号已绑定，第三方昵称或头像已按你的选择处理。"
          : "账号已绑定。",
      )
    }

    window.addEventListener("message", handleOAuthLinked)
    return () => window.removeEventListener("message", handleOAuthLinked)
  }, [loadIdentities, loadProfileData, onSaved])

  const handleLinkProvider = async (provider: AuthOAuthProvider) => {
    setActiveLinkProvider(provider)
    setErrorMessage(null)
    setSuccessMessage(null)
    const popup = openOAuthLinkPopup()

    try {
      const supabase = createSupabaseBrowserClient()
      const callbackParams = new URLSearchParams({ provider, flow: "link" })
      const redirectTo = `${window.location.origin}/auth/callback?${callbackParams.toString()}`
      const oauthProvider = provider === "wechat" ? ("wechat" as never) : ("douyin" as never)
      const { data, error } = await supabase.auth.linkIdentity({
        provider: oauthProvider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        throw error
      }

      if (!data.url) {
        throw new Error(`${provider} link url missing`)
      }

      if (popup && !popup.closed) {
        popup.location.href = data.url
      } else {
        openOAuthLinkPopup(data.url)
      }

      setActiveLinkProvider(null)
    } catch (error) {
      if (popup && !popup.closed) {
        popup.close()
      }
      setActiveLinkProvider(null)
      setErrorMessage(error instanceof Error ? error.message : "绑定登录方式失败，请稍后重试。")
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ""

    if (!selectedFile) {
      return
    }

    if (
      !PROFILE_AVATAR_ALLOWED_TYPES.includes(
        selectedFile.type as (typeof PROFILE_AVATAR_ALLOWED_TYPES)[number],
      )
    ) {
      setErrorMessage("头像仅支持 JPG、PNG、WebP 格式。")
      setSuccessMessage(null)
      return
    }

    if (selectedFile.size > PROFILE_AVATAR_MAX_BYTES) {
      setErrorMessage("头像图片不能超过 2MB。")
      setSuccessMessage(null)
      return
    }

    setIsUploadingAvatar(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("登录状态已失效，请重新登录后再上传头像。")
      }

      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = (await response.json()) as {
        code: string
        message: string
        data: UploadProfileAvatarResponseData | null
      }

      if (result.code !== "OK" || !result.data) {
        throw new Error(result.message || "头像上传失败，请稍后重试。")
      }

      updateField("avatarUrl", result.data.avatarUrl)
      setUploadedAvatarPreviousUrl(result.data.previousAvatarUrl)
      setSuccessMessage("头像已上传，请点击“保存修改”完成资料更新。")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "头像上传失败，请稍后重试。")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    const validationError = validateProfileForm(profile)

    if (validationError) {
      setErrorMessage(validationError)
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload: UpdateProfileMeRequest = {
      nickname: profile.nickname.trim(),
      avatarUrl: normalizeOptionalString(profile.avatarUrl),
      email: normalizeOptionalString(profile.email),
      wechat: normalizeOptionalString(profile.wechat),
      bio: normalizeOptionalString(profile.bio),
    }

    try {
      const data = await requestData<ProfileMeResponseData>("/profile/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })

      if (uploadedAvatarPreviousUrl && uploadedAvatarPreviousUrl !== data.avatarUrl) {
        const previousStoragePath = getAvatarStoragePathFromUrl(
          uploadedAvatarPreviousUrl,
          data.userId,
        )

        if (previousStoragePath) {
          try {
            const supabase = createSupabaseBrowserClient()
            const { error: removeError } = await supabase.storage
              .from(PROFILE_AVATAR_BUCKET)
              .remove([previousStoragePath])

            if (removeError) {
              console.error("Failed to delete previous profile avatar", {
                userId: data.userId,
                previousStoragePath,
                message: removeError.message,
              })
            }
          } catch (cleanupError) {
            console.error("Unexpected error while deleting previous profile avatar", {
              userId: data.userId,
              previousStoragePath,
              message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            })
          }
        }
      }

      setProfile(toFormState(data))
      setSuccessMessage("个人资料已保存。")
      setUploadedAvatarPreviousUrl(null)
      dispatchProfileUpdated(data)
      onSaved?.(data)
      onOpenChange(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。")
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    if (errorMessage) {
      setErrorMessage(null)
    }
    if (successMessage) {
      setSuccessMessage(null)
    }
  }

  const previewInitial = profile.nickname.trim().slice(0, 1) || "我"
  const isBusy = isLoading || isSaving || isUploadingAvatar

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(DIALOG_PANEL_CLASS, "max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[560px]")}>
        <div className="overflow-hidden rounded-2xl">
          <div className={cn("border-b px-5 py-4", USER_PANEL_DIVIDER_CLASS)}>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">个人资料</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                修改头像、昵称、联系方式和个人简介
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="flex justify-center">
              <input
                ref={avatarFileInputRef}
                type="file"
                accept={PROFILE_AVATAR_ALLOWED_TYPES.join(",")}
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={isBusy}
                className="group relative rounded-full"
              >
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-dim text-2xl font-bold text-brand">
                  {profile.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt="avatar"
                      width={80}
                      height={80}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    previewInitial
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/38 group-hover:opacity-100">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </div>
                <span className="sr-only">上传头像</span>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium text-muted-foreground">
                  昵称
                </Label>
                <Input
                  id="nickname"
                  value={profile.nickname}
                  onChange={(e) => updateField("nickname", e.target.value)}
                  placeholder="输入昵称"
                  disabled={isBusy}
                  className={cn("rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20", USER_PANEL_FIELD_CLASS)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                  手机号码
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  readOnly
                  disabled
                  placeholder="未绑定手机号"
                  className={cn("rounded-[10px] text-foreground/60 placeholder:text-muted-foreground/40", USER_PANEL_FIELD_CLASS)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat" className="text-sm font-medium text-muted-foreground">
                  微信号
                </Label>
                <Input
                  id="wechat"
                  value={profile.wechat}
                  onChange={(e) => updateField("wechat", e.target.value)}
                  placeholder="输入微信号（可选）"
                  disabled={isBusy}
                  className={cn("rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20", USER_PANEL_FIELD_CLASS)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  联系邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="输入邮箱（可选）"
                  disabled={isBusy}
                  className={cn("rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20", USER_PANEL_FIELD_CLASS)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium text-muted-foreground">
                个人简介
              </Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="介绍一下自己吧（可选）"
                rows={4}
                disabled={isBusy}
                className={cn("resize-none rounded-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20", USER_PANEL_FIELD_CLASS)}
              />
              <p className="text-right text-xs text-muted-foreground">{profile.bio.trim().length}/300</p>
            </div>

            {isLoading ? (
              <div className={cn("flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground", USER_PANEL_SECTION_CLASS)}>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载个人资料...
              </div>
            ) : null}

            {!isLoading ? (
              <div className="text-xs text-muted-foreground">
                点击头像即可上传新图片，支持 JPG、PNG、WebP，文件大小不超过 2MB。
              </div>
            ) : null}

            <div className={cn("space-y-3 rounded-2xl border px-4 py-4", USER_PANEL_SECTION_CLASS)}>
              <div>
                <p className="text-sm font-semibold text-foreground">登录方式</p>
                <p className="mt-1 text-xs text-muted-foreground">手机号为主账号，微信和抖音绑定后可用于扫码登录。</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">手机号</p>
                    <p className="text-xs text-muted-foreground">{profile.phone || "未绑定手机号"}</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    主账号
                  </span>
                </div>

                {OAUTH_PROVIDERS.map((provider) => {
                  const meta = getOAuthProviderMeta(provider.id)
                  const Icon = meta.icon
                  const linked = linkedProviders.has(provider.id)
                  const isActive = activeLinkProvider === provider.id

                  return (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-2">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{meta.label.replace("扫码登录", "")}</p>
                          <p className="text-xs text-muted-foreground">{linked ? "已绑定，可扫码登录" : "未绑定"}</p>
                        </div>
                      </div>
                      {linked ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          已绑定
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy || Boolean(activeLinkProvider)}
                          onClick={() => void handleLinkProvider(provider.id)}
                          className={cn("h-8 rounded-full px-3 text-xs", USER_PANEL_OUTLINE_BUTTON_CLASS)}
                        >
                          {isActive ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              准备中
                            </>
                          ) : (
                            "绑定"
                          )}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className={cn("flex gap-3 border-t px-5 py-4", USER_PANEL_DIVIDER_CLASS)}>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className={cn("flex-1", USER_PANEL_OUTLINE_BUTTON_CLASS)}
            >
              取消
            </Button>
            <Button size="lg" onClick={handleSave} disabled={isBusy} className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中
                </>
              ) : (
                "保存修改"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
