"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"

type FeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const feedbackTypeOptions = [
  { value: "visual_design", label: "界面视觉" },
  { value: "interaction_flow", label: "交互流程" },
  { value: "feature_request", label: "功能建议" },
  { value: "issue_report", label: "问题反馈" },
] as const

type FeedbackType = (typeof feedbackTypeOptions)[number]["value"]

const initialForm = {
  feedbackType: "interaction_flow" as FeedbackType,
  title: "",
  content: "",
  contactMethod: "",
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isValid = useMemo(
    () => Boolean(form.feedbackType && form.title.trim() && form.content.trim()),
    [form.content, form.feedbackType, form.title],
  )

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(initialForm)
      setIsSubmitting(false)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (!isValid) return
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-white/10 bg-[oklch(0.2_0.015_250/0.98)] p-0 text-foreground shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)] sm:max-w-[560px]">
        <div className="overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">建议反馈</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                告诉我们你对前端设计、交互体验、功能能力或问题修复的真实想法。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">反馈类型</Label>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {feedbackTypeOptions.map((option) => {
                  const active = form.feedbackType === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("feedbackType", option.value)}
                      className={cn(
                        "flex items-center gap-3 pt-2 text-left transition-colors",
                        active
                          ? "text-brand"
                          : "text-foreground/80",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                          active
                            ? "border-brand bg-brand/10"
                            : "border-white/20 bg-transparent",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full transition-colors",
                            active ? "bg-brand" : "bg-transparent",
                          )}
                        />
                      </div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-title" className="text-sm font-medium text-muted-foreground">
                标题
              </Label>
              <Input
                id="feedback-title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="一句话概括你的建议或问题"
                className="rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="feedback-content"
                className="text-sm font-medium text-muted-foreground"
              >
                反馈内容
              </Label>
              <Textarea
                id="feedback-content"
                value={form.content}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder="详细描述你遇到的问题、建议或希望优化的地方"
                rows={6}
                className="resize-none rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="feedback-contact"
                className="text-sm font-medium text-muted-foreground"
              >
                接受回访方式（可选）
              </Label>
              <Input
                id="feedback-contact"
                value={form.contactMethod}
                onChange={(e) => updateField("contactMethod", e.target.value)}
                placeholder="请输入方便回访联系的手机号或微信号"
                className="rounded-[10px] border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:border-brand/50 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="flex gap-3 border-t border-white/10 px-5 py-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleOpenChange(false)}
              className="flex-1 rounded-[10px] border-white/10 bg-transparent text-foreground hover:bg-white/5 hover:text-white"
            >
              取消
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="flex-1 rounded-[10px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中
                </>
              ) : (
                "提交反馈"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
