"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { AdminUserDetailResponseData, AdminUserListItem } from "@/lib/api/contracts/admin-users"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { buildAdminUserPatchPayload } from "../lib/edit-payload"

type UserEditSheetProps = {
  user: AdminUserListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (user: AdminUserDetailResponseData) => Promise<void> | void
  onAuthExpired: () => void
}

export function UserEditSheet({
  user,
  open,
  onOpenChange,
  onSaved,
  onAuthExpired,
}: UserEditSheetProps) {
  const toast = useAppToast()
  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [wechat, setWechat] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !open) {
      return
    }

    setNickname(user.nickname ?? "")
    setBio(user.bio ?? "")
    setContactEmail(user.contactEmail ?? "")
    setWechat(user.wechat ?? "")
  }, [open, user])

  const handleSave = async () => {
    if (!user) {
      return
    }

    setSaving(true)
    try {
      const payload = buildAdminUserPatchPayload({
        user,
        form: {
          nickname,
          bio,
          contactEmail,
          wechat,
        },
      })

      if (Object.keys(payload).length === 0) {
        toast.info("没有可保存的变更")
        onOpenChange(false)
        return
      }

      const result = await adminRequestData<AdminUserDetailResponseData>(
        `/admin/users/${user.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "保存失败",
      )

      await onSaved(result)
      onOpenChange(false)
    } catch (saveError) {
      if (isAdminSessionExpiredError(saveError)) {
        onAuthExpired()
      }
      toast.error(getAdminApiErrorMessage(saveError, "保存失败"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md xl:max-w-[26vw]">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>编辑用户资料</SheetTitle>
          <SheetDescription>
            {user ? `ID: ${user.userId}` : "修改该用户的个人资料。"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>头像</Label>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                    {(user?.nickname ?? "?").slice(0, 1)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">当前头像仅展示，不可在此处修改。</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-authPhone">手机号</Label>
              <Input id="edit-authPhone" value={user?.authPhone ?? "暂无手机号"} disabled readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nickname">昵称</Label>
              <Input id="edit-nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-bio">简介</Label>
              <Textarea id="edit-bio" rows={5} value={bio} onChange={(event) => setBio(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-contactEmail">联系邮箱</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-wechat">微信</Label>
              <Input id="edit-wechat" value={wechat} onChange={(event) => setWechat(event.target.value)} />
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || !user}>
            {saving ? "保存中…" : "保存修改"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
