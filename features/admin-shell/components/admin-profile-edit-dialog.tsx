"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Camera, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import type {
  ProfileMeResponseData,
  UploadProfileAvatarResponseData,
  UpdateProfileMeRequest,
} from "@/lib/api/contracts/auth"
import { adminBffFetch, adminRequestData } from "@/lib/api/admin-bff-client"
import {
  PROFILE_AVATAR_ALLOWED_TYPES,
  PROFILE_AVATAR_MAX_BYTES,
} from "@/lib/supabase/storage"

type AdminProfileEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function AdminProfileEditDialog({ open, onOpenChange, onSaved }: AdminProfileEditDialogProps) {
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [preservedWechat, setPreservedWechat] = useState<string | null>(null)
  const [preservedBio, setPreservedBio] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setErrorMessage(null)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const data = await adminRequestData<ProfileMeResponseData>("/profile/me")
        if (cancelled) {
          return
        }
        setNickname(data.nickname ?? "")
        setEmail(data.email ?? "")
        setAvatarUrl(data.avatarUrl ?? "")
        setPreservedWechat(data.wechat ?? null)
        setPreservedBio(data.bio ?? null)
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : "加载资料失败")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) {
      return
    }

    if (
      !PROFILE_AVATAR_ALLOWED_TYPES.includes(
        file.type as (typeof PROFILE_AVATAR_ALLOWED_TYPES)[number],
      )
    ) {
      setErrorMessage("头像仅支持 JPG、PNG、WebP 格式。")
      return
    }

    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      setErrorMessage("头像图片不能超过 2MB。")
      return
    }

    setIsUploadingAvatar(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await adminBffFetch("/profile/avatar", {
        method: "POST",
        body: formData,
      })

      const result = (await response.json()) as {
        code: string
        message: string
        data: UploadProfileAvatarResponseData | null
      }

      if (result.code !== "OK" || !result.data) {
        throw new Error(result.message || "头像上传失败")
      }

      setAvatarUrl(result.data.avatarUrl)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "头像上传失败")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    const nick = nickname.trim()
    if (nick.length < 2) {
      setErrorMessage("显示名至少需要 2 个字符。")
      return
    }
    if (nick.length > 24) {
      setErrorMessage("显示名最多 24 个字符。")
      return
    }
    const mail = email.trim()
    if (mail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setErrorMessage("邮箱格式不正确。")
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    const payload: UpdateProfileMeRequest = {
      nickname: nick,
      avatarUrl: avatarUrl.trim().length > 0 ? avatarUrl.trim() : null,
      email: mail.length > 0 ? mail : null,
      wechat: preservedWechat,
      bio: preservedBio,
    }

    try {
      await adminRequestData<ProfileMeResponseData>("/profile/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      onOpenChange(false)
      onSaved?.()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存失败")
    } finally {
      setIsSaving(false)
    }
  }

  const previewInitial = nickname.trim().slice(0, 1) || "管"
  const busy = isLoading || isSaving || isUploadingAvatar

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>资料编辑</DialogTitle>
          <DialogDescription>更新管理后台展示用显示名、头像与联系邮箱。</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage ? (
              <StatePanel status="error" title="操作失败" description={errorMessage} compact />
            ) : null}

            <div className="flex flex-col items-center gap-3">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary">
                    {previewInitial}
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100"
                  aria-label="上传头像"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6" />
                  )}
                </button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept={PROFILE_AVATAR_ALLOWED_TYPES.join(",")}
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground">点击头像区域上传，支持 JPG / PNG / WebP，最大 2MB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-profile-nickname">显示名</Label>
              <Input
                id="admin-profile-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={busy}
                maxLength={24}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-profile-email">邮箱</Label>
              <Input
                id="admin-profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="选填"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                取消
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={busy}>
                {isSaving ? "保存中…" : "保存"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
