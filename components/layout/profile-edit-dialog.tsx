"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type ProfileEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const mockUserProfile = {
  avatar: "",
  nickname: "小明同学",
  phone: "138****8888",
  wechat: "xiaoming_dev",
  email: "xiaoming@example.com",
  bio: "正在学习 AI 编程，希望用 AI 工具提升开发效率。",
}

export function ProfileEditDialog({ open, onOpenChange }: ProfileEditDialogProps) {
  const [profile, setProfile] = useState(mockUserProfile)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    onOpenChange(false)
  }

  const updateField = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-white/10 bg-[oklch(0.2_0.015_250/0.98)] p-0 text-foreground shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)] sm:max-w-[560px]">
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
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-dim text-2xl font-bold text-brand">
                  {profile.avatar ? (
                    <Image
                      src={profile.avatar}
                      alt="avatar"
                      width={80}
                      height={80}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profile.nickname.slice(0, 1)
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-surface-2 text-foreground/70 shadow-sm transition-colors hover:bg-surface-3 hover:text-foreground"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">点击更换头像</p>
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
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="输入手机号码"
                  className="rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
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
                  className="rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="输入邮箱（可选）"
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
                rows={3}
                className="resize-none rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="flex gap-3 border-t border-white/10 px-5 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-[10px] border-white/10 bg-transparent text-foreground hover:bg-white/5 hover:text-white "
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="flex-1 rounded-[10px]">
              {isLoading ? (
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
