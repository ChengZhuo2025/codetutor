"use client"

import { useEffect, useState } from "react"
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
import {
  DIALOG_PANEL_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
  USER_PANEL_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import { TimePicker } from "@/components/ui/time-picker"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import type { NotificationSettingsData } from "@/lib/api/contracts/notifications"
import { requestData } from "@/lib/api/client"
import { cn } from "@/lib/utils"

type NotificationSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const defaultNotificationSettings: NotificationSettingsData = {
  checkinReminder: true,
  checkinTime: "09:00",
  progressPush: true,
  remindMethods: {
    app: true,
    email: false,
    wechat: false,
  },
  doNotDisturb: false,
  doNotDisturbStart: "22:00",
  doNotDisturbEnd: "08:00",
}

export function NotificationSettingsDialog({ open, onOpenChange }: NotificationSettingsDialogProps) {
  const toast = useAppToast()
  const [settings, setSettings] = useState<NotificationSettingsData>(defaultNotificationSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    setIsLoading(true)

    void requestData<NotificationSettingsData>("/notifications/settings")
      .then((data) => {
        if (!cancelled) {
          setSettings(data)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "加载通知设置失败")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, toast])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const data = await requestData<NotificationSettingsData>("/notifications/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      })

      setSettings(data)
      toast.success("通知设置已保存")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存通知设置失败")
    } finally {
      setIsSaving(false)
    }
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
      <DialogContent className={cn(DIALOG_PANEL_CLASS, "max-h-[90vh] overflow-y-auto sm:max-w-[480px] p-0")}>
        <div className="overflow-hidden">
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.24_270/0.12),transparent_46%)] px-4 py-5 dark:border-white/14 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_270/0.16),transparent_46%)] sm:px-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">通知设置</DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
                管理学习提醒和消息推送方式
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-1 px-5 py-4">
            {isLoading ? (
              <div className={cn("flex items-center justify-center px-4 py-10 text-sm text-muted-foreground", USER_PANEL_SECTION_CLASS)}>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在加载通知设置
              </div>
            ) : null}

            {!isLoading ? (
              <>
                <div className="p-4 rounded-2xl border border-border/70 bg-surface-2">
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
                      className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:border-border/80"
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
                        className="w-32 border border-border/70 rounded-md bg-surface-3"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-border/70 bg-surface-2">
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
                      className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:border-border/80"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/70 bg-surface-2">
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
                        className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:border-border/80"
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
                        className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:border-border/80"
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
                        className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:border-border/80"
                      />
                    </div>
                  </div>
                </div>
                <p className="px-1 text-xs text-muted-foreground">
                  当前只有站内提醒已接入真实发送；邮件和微信通知会保存你的偏好，但暂不会实际下发。
                </p>

                <div className="p-4 rounded-2xl border border-border/70 bg-surface-2">
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
                      className="data-[state=unchecked]:bg-surface-4 data-[state=unchecked]:border-border/80"
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
              </>
            ) : null}
          </div>

          <div className={cn("flex w-full flex-row items-stretch gap-3 border-t px-5 py-4", USER_PANEL_DIVIDER_CLASS)}>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              className={cn("min-w-0 flex-1", USER_PANEL_OUTLINE_BUTTON_CLASS)}
            >
              取消
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="min-w-0 flex-1"
            >
              {isSaving ? (
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
