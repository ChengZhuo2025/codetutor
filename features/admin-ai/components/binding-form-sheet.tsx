"use client"

import { useEffect, useState } from "react"
import type {
  AdminAIAgentBindingListItem,
  AdminAIAgentBindingListResponseData,
  AdminAIAgentBindingUpsertRequest,
} from "@/lib/api/contracts/admin-ai"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { getLearningLevelLabel, getSelectionModeLabel } from "@/constants/learning-taxonomy"
import {
  getAdminAIInteractionTypeLabel,
  prettyJson,
  safeJsonParse,
} from "@/features/admin-ai/lib/view-model"
import { AdminFieldLabel } from "./admin-field-label"

const EMPTY_FORM = {
  agentCode: "",
  toolId: "",
  learningLevel: "",
  selectionMode: "",
  pathId: "",
  stepNo: "",
  interactionType: "teaching",
  priority: 100,
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

type BindingFormState = typeof EMPTY_FORM

const INTERACTION_TYPE_OPTIONS = [
  "teaching",
  "blocked_help",
  "task_review",
  "completion_feedback",
  "path_guidance",
] as const

const LEARNING_LEVEL_OPTIONS = [
  "beginner",
  "intermediate",
  "advanced",
] as const

const SELECTION_MODE_OPTIONS = [
  "self_directed",
  "preset_training",
] as const

function mapItemToForm(item: AdminAIAgentBindingListItem): BindingFormState {
  return {
    agentCode: item.agentCode,
    toolId: item.toolId ?? "",
    learningLevel: item.learningLevel ?? "",
    selectionMode: item.selectionMode ?? "",
    pathId: item.pathId ?? "",
    stepNo: item.stepNo == null ? "" : String(item.stepNo),
    interactionType: item.interactionType,
    priority: item.priority,
    isActive: item.isActive,
    metadataText: prettyJson(item.metadata),
    changeReason: "",
  }
}

type BindingFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bindingItem: AdminAIAgentBindingListItem | null
  options: Pick<AdminAIAgentBindingListResponseData, "agentOptions" | "toolOptions" | "pathOptions"> | null
  onSaved: () => Promise<void> | void
  onAuthExpired: () => void
}

export function BindingFormSheet({
  open,
  onOpenChange,
  bindingItem,
  options,
  onSaved,
  onAuthExpired,
}: BindingFormSheetProps) {
  const toast = useAppToast()
  const [form, setForm] = useState<BindingFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const interactionTypeOptions = INTERACTION_TYPE_OPTIONS.includes(form.interactionType as (typeof INTERACTION_TYPE_OPTIONS)[number])
    ? INTERACTION_TYPE_OPTIONS
    : [...INTERACTION_TYPE_OPTIONS, form.interactionType]

  useEffect(() => {
    if (!open) {
      return
    }
    if (bindingItem) {
      setForm(mapItemToForm(bindingItem))
      return
    }
    setForm((prev) => ({
      ...EMPTY_FORM,
      agentCode: options?.agentOptions?.[0]?.code ?? prev.agentCode,
    }))
  }, [bindingItem, open, options?.agentOptions])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: AdminAIAgentBindingUpsertRequest = {
        agentCode: form.agentCode,
        toolId: form.toolId || null,
        learningLevel: (form.learningLevel || null) as AdminAIAgentBindingUpsertRequest["learningLevel"],
        selectionMode: (form.selectionMode || null) as AdminAIAgentBindingUpsertRequest["selectionMode"],
        pathId: form.pathId || null,
        stepNo: form.stepNo ? Number(form.stepNo) : null,
        interactionType: form.interactionType,
        priority: Number(form.priority),
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      if (bindingItem) {
        await adminRequestData(`/admin/ai/agent-bindings/${bindingItem.bindingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, "更新命中规则失败")
      } else {
        await adminRequestData("/admin/ai/agent-bindings", {
          method: "POST",
          body: JSON.stringify(payload),
        }, "创建命中规则失败")
      }

      await onSaved()
      onOpenChange(false)
      toast.success(bindingItem ? "命中规则已更新" : "命中规则已创建")
    } catch (error) {
      if (isAdminSessionExpiredError(error)) {
        onAuthExpired()
      }
      toast.error(getAdminApiErrorMessage(error, bindingItem ? "更新命中规则失败" : "创建命中规则失败"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>{bindingItem ? "编辑命中规则" : "新建命中规则"}</SheetTitle>
          <SheetDescription>维护不同工具、路径、等级与交互类型下命中的 Agent。</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-agentCode" label="Agent" required />
                <select id="binding-agentCode" value={form.agentCode} onChange={(event) => setForm((prev) => ({ ...prev, agentCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                  <option value="">请选择 Agent</option>
                  {options?.agentOptions?.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-interactionType" label="交互类型" required />
                <select
                  id="binding-interactionType"
                  value={form.interactionType}
                  onChange={(event) => setForm((prev) => ({ ...prev, interactionType: event.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none"
                >
                  {interactionTypeOptions.map((item) => (
                    <option key={item} value={item}>
                      {getAdminAIInteractionTypeLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-toolId" label="Tool" />
                <select id="binding-toolId" value={form.toolId} onChange={(event) => setForm((prev) => ({ ...prev, toolId: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                  <option value="">全部 Tool</option>
                  {options?.toolOptions?.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-pathId" label="Path" />
                <select id="binding-pathId" value={form.pathId} onChange={(event) => setForm((prev) => ({ ...prev, pathId: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                  <option value="">全部 Path</option>
                  {options?.pathOptions?.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-learningLevel" label="学习等级" />
                <select id="binding-learningLevel" value={form.learningLevel} onChange={(event) => setForm((prev) => ({ ...prev, learningLevel: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                  <option value="">全部等级</option>
                  {LEARNING_LEVEL_OPTIONS.map((item) => (
                    <option key={item} value={item}>{getLearningLevelLabel(item, "short")}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-selectionMode" label="学习模式" />
                <select id="binding-selectionMode" value={form.selectionMode} onChange={(event) => setForm((prev) => ({ ...prev, selectionMode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                  <option value="">全部模式</option>
                  {SELECTION_MODE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{getSelectionModeLabel(item, "short")}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-stepNo" label="Step No" />
                <Input id="binding-stepNo" value={form.stepNo} onChange={(event) => setForm((prev) => ({ ...prev, stepNo: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="binding-priority" label="Priority" required />
                <Input id="binding-priority" type="number" value={String(form.priority)} onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) || 0 }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-none">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              启用
            </label>
            <div className="space-y-1.5">
              <AdminFieldLabel htmlFor="binding-metadata" label="Metadata JSON" helpText="可留空，默认填 {}。用于记录该命中规则的补充信息。" />
              <Textarea id="binding-metadata" rows={6} value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <AdminFieldLabel htmlFor="binding-changeReason" label="变更原因" required helpText="用于审计记录，建议写明本次规则调整目的。" />
              <Textarea id="binding-changeReason" rows={4} value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} />
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : bindingItem ? "保存修改" : "创建规则"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
