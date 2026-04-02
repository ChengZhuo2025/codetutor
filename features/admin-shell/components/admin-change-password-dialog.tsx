"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { ADMIN_ROUTES } from "@/constants/routes"
import { adminBffFetch } from "@/lib/api/admin-bff-client"
import type { ApiResponse } from "@/lib/api/types"

type AdminChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminChangePasswordDialog({ open, onOpenChange }: AdminChangePasswordDialogProps) {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resetForm = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setErrorMessage(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm()
    }
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    setErrorMessage(null)

    if (newPassword !== confirmPassword) {
      setErrorMessage("两次输入的新密码不一致。")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await adminBffFetch("/admin/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const json = (await response.json()) as ApiResponse<{ success: true }>

      if (json.code !== "OK") {
        setErrorMessage(json.message || "修改失败")
        return
      }

      resetForm()
      onOpenChange(false)
      router.replace(ADMIN_ROUTES.login)
      router.refresh()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "修改失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>成功后需使用新密码重新登录管理后台。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage ? (
            <StatePanel status="error" title="无法修改" description={errorMessage} compact />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="admin-curr-pw">当前密码</Label>
            <Input
              id="admin-curr-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-new-pw">新密码</Label>
            <Input
              id="admin-new-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">至少 8 位，需同时包含英文字母与数字。</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-confirm-pw">确认新密码</Label>
            <Input
              id="admin-confirm-pw"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? "提交中…" : "确认修改"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
