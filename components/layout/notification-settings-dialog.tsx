"use client"

import { useState } from "react"
import { Bell, BellOff, Clock, Mail, MessageSquare, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { TimePicker } from "@/components/ui/time-picker"

type NotificationSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const mockNotificationSettings = {
  checkinReminder: true,
  checkinTime: "09:00",
  progressPush: true,
  remindMethods: {
    app: true,
    email: false,
    wechat: true,
  },
  doNotDisturb: false,
  doNotDisturbStart: "22:00",
  doNotDisturbEnd: "08:00",
}

export function NotificationSettingsDialog({ open, onOpenChange }: NotificationSettingsDialogProps) {
  const [settings, setSettings] = useState(mockNotificationSettings)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    onOpenChange(false)
  }

  const updateSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const updateRemindMethod = (method: keyof typeof settings.remindMethods, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      remindMethods: { ...prev.remindMethods, [method]: value },
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-white/10 bg-[oklch(0.2_0.015_250/0.98)] p-0 text-foreground shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)] sm:max-w-[480px]">
        <div className="overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">通知设置</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                管理学习提醒和消息推送方式
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-1 px-5 py-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">打卡提醒</p>
                    <p className="text-xs text-muted-foreground">每日定时提醒你开始学习</p>
                  </div>
                </div>
                <Switch
                  checked={settings.checkinReminder}
                  onCheckedChange={(checked) => updateSetting("checkinReminder", checked)}
                  className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-white/20"
                />
              </div>

              {settings.checkinReminder && (
                <div className="mt-3 flex items-center gap-2 pl-[52px]">
                  <Label htmlFor="checkinTime" className="text-xs text-muted-foreground">
                    提醒时间
                  </Label>
                  <TimePicker
                    id="checkinTime"
                    value={settings.checkinTime}
                    onChange={(value) => updateSetting("checkinTime", value)}
                    className="w-32"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-chart-3/20 bg-chart-3/10 text-chart-3">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">进度推送</p>
                    <p className="text-xs text-muted-foreground">任务完成、段位提升等重要节点通知</p>
                  </div>
                </div>
                <Switch
                  checked={settings.progressPush}
                  onCheckedChange={(checked) => updateSetting("progressPush", checked)}
                  className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-white/20"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">提醒方式</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-foreground/75" />
                    <span className="text-sm text-foreground/80">站内通知</span>
                  </div>
                  <Switch
                    checked={settings.remindMethods.app}
                    onCheckedChange={(checked) => updateRemindMethod("app", checked)}
                    className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-white/20"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-foreground/75" />
                    <span className="text-sm text-foreground/80">邮件通知</span>
                  </div>
                  <Switch
                    checked={settings.remindMethods.email}
                    onCheckedChange={(checked) => updateRemindMethod("email", checked)}
                    className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-white/20"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-foreground/75" />
                    <span className="text-sm text-foreground/80">微信通知</span>
                  </div>
                  <Switch
                    checked={settings.remindMethods.wechat}
                    onCheckedChange={(checked) => updateRemindMethod("wechat", checked)}
                    className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                    <BellOff className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">免打扰模式</p>
                    <p className="text-xs text-muted-foreground">在指定时间段内关闭所有通知</p>
                  </div>
                </div>
                <Switch
                  checked={settings.doNotDisturb}
                  onCheckedChange={(checked) => updateSetting("doNotDisturb", checked)}
                  className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-white/20"
                />
              </div>

              {settings.doNotDisturb && (
                <div className="mt-3 flex items-center gap-2 pl-[52px]">
                  <Label className="text-xs text-muted-foreground">静默时段</Label>
                  <TimePicker
                    value={settings.doNotDisturbStart}
                    onChange={(value) => updateSetting("doNotDisturbStart", value)}
                    className="w-28"
                  />
                  <span className="text-xs text-muted-foreground">至</span>
                  <TimePicker
                    value={settings.doNotDisturbEnd}
                    onChange={(value) => updateSetting("doNotDisturbEnd", value)}
                    className="w-28"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 border-t border-white/10 px-5 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-[10px] border-white/10 bg-transparent text-foreground hover:bg-white/5"
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
                "保存设置"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
