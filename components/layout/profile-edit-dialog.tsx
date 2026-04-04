"use client"

import { useEffect, useRef, useState } from "react"
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
  PROFILE_AVATAR_ALLOWED_TYPES,
  PROFILE_AVATAR_BUCKET,
  PROFILE_AVATAR_MAX_BYTES,
  getAvatarStoragePathFromUrl,
} from "@/lib/supabase/storage"
import { dispatchProfileUpdated } from "@/lib/profile/events"
import { DIALOG_DARK_PANEL_CLASS } from "@/components/ui/surface-styles"
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
  const [uploadedAvatarPreviousUrl, setUploadedAvatarPreviousUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

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
        const data = await requestData<ProfileMeResponseData>("/profile/me")

        if (cancelled) {
          return
        }

        setProfile(toFormState(data))
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
  }, [open])

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
      <DialogContent className={cn(DIALOG_DARK_PANEL_CLASS, "max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[560px]")}>
        <div className="overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-5 py-4">
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
                  className="rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
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
                  className="rounded-[10px] border-white/10 bg-white/5 text-foreground/60 placeholder:text-muted-foreground/40"
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
                  className="rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
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
                  className="rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
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
                className="resize-none rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
              />
              <p className="text-right text-xs text-muted-foreground">{profile.bio.trim().length}/300</p>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载个人资料...
              </div>
            ) : null}

            {!isLoading ? (
              <div className="text-xs text-muted-foreground">
                点击头像即可上传新图片，支持 JPG、PNG、WebP，文件大小不超过 2MB。
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 border-t border-white/10 px-5 py-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="flex-1 rounded-[10px] border-white/10 bg-transparent text-foreground hover:bg-white/5 hover:text-white"
            >
              取消
            </Button>
            <Button size="lg" onClick={handleSave} disabled={isBusy} className="flex-1 rounded-[10px]">
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
