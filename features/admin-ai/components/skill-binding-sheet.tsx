"use client"

import { useEffect, useState } from "react"
import type {
  AdminAIAgentSkillBindingListItem,
  AdminAIAgentSkillBindingListResponseData,
  AdminAIAgentSkillBindingUpsertRequest,
} from "@/lib/api/contracts/admin-ai"
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
import { prettyJson, safeJsonParse } from "@/features/admin-ai/lib/view-model"

const EMPTY_FORM = {
  agentCode: "",
  skillCode: "",
  priority: 100,
  isRequired: true,
  contextBudgetTokens: 800,
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

type SkillBindingFormState = typeof EMPTY_FORM

function mapItemToForm(item: AdminAIAgentSkillBindingListItem): SkillBindingFormState {
  return {
    agentCode: item.agentCode,
    skillCode: item.skillCode,
    priority: item.priority,
    isRequired: item.isRequired,
    contextBudgetTokens: item.contextBudgetTokens ?? 0,
    isActive: item.isActive,
    metadataText: prettyJson(item.metadata),
    changeReason: "",
  }
}

type SkillBindingSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bindingItem: AdminAIAgentSkillBindingListItem | null
  options: Pick<AdminAIAgentSkillBindingListResponseData, "agentOptions" | "skillOptions"> | null
  onSaved: () => Promise<void> | void
  onAuthExpired: () => void
}

export function SkillBindingSheet({
  open,
  onOpenChange,
  bindingItem,
  options,
  onSaved,
  onAuthExpired,
}: SkillBindingSheetProps) {
  const toast = useAppToast()
  const [form, setForm] = useState<SkillBindingFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

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
      skillCode: options?.skillOptions?.[0]?.code ?? prev.skillCode,
    }))
  }, [bindingItem, open, options?.agentOptions, options?.skillOptions])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: AdminAIAgentSkillBindingUpsertRequest = {
        agentCode: form.agentCode,
        skillCode: form.skillCode,
        priority: Number(form.priority),
        isRequired: form.isRequired,
        contextBudgetTokens: Number(form.contextBudgetTokens) || null,
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      if (bindingItem) {
        await adminRequestData(`/admin/ai/agent-skill-bindings/${bindingItem.bindingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, "更新 Skill 绑定失败")
      } else {
        await adminRequestData("/admin/ai/agent-skill-bindings", {
          method: "POST",
          body: JSON.stringify(payload),
        }, "创建 Skill 绑定失败")
      }

      await onSaved()
      onOpenChange(false)
      toast.success(bindingItem ? "Skill 绑定已更新" : "Skill 绑定已创建")
    } catch (error) {
      if (isAdminSessionExpiredError(error)) {
        onAuthExpired()
      }
      toast.error(getAdminApiErrorMessage(error, bindingItem ? "更新 Skill 绑定失败" : "创建 Skill 绑定失败"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>{bindingItem ? "编辑 Skill 绑定" : "新建 Skill 绑定"}</SheetTitle>
          <SheetDescription>维护 Agent 到 Skill 的上下文挂载关系。</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="skill-binding-agentCode">Agent</Label>
              <select id="skill-binding-agentCode" value={form.agentCode} onChange={(event) => setForm((prev) => ({ ...prev, agentCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]">
                <option value="">请选择 Agent</option>
                {options?.agentOptions?.map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skill-binding-skillCode">Skill</Label>
              <select id="skill-binding-skillCode" value={form.skillCode} onChange={(event) => setForm((prev) => ({ ...prev, skillCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]">
                <option value="">请选择 Skill</option>
                {options?.skillOptions?.map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="skill-binding-priority">Priority</Label>
                <Input id="skill-binding-priority" type="number" value={String(form.priority)} onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="skill-binding-contextBudgetTokens">Context Budget Tokens</Label>
                <Input id="skill-binding-contextBudgetTokens" type="number" value={String(form.contextBudgetTokens)} onChange={(event) => setForm((prev) => ({ ...prev, contextBudgetTokens: Number(event.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
                <input type="checkbox" checked={form.isRequired} onChange={(event) => setForm((prev) => ({ ...prev, isRequired: event.target.checked }))} />
                Required
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                启用
              </label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skill-binding-metadata">Metadata JSON</Label>
              <Textarea id="skill-binding-metadata" rows={6} value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skill-binding-changeReason">变更原因</Label>
              <Textarea id="skill-binding-changeReason" rows={4} value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} />
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : bindingItem ? "保存修改" : "创建绑定"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
