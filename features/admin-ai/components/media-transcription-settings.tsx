"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Eye, Pencil, RefreshCw, Save } from "lucide-react"
import type {
  AdminAIMediaModelOption,
  AdminAIMediaTranscriptionSettingItem,
  AdminAIMediaTranscriptionSettingsResponseData,
  AdminAIMediaTranscriptionSettingUpdateResponseData,
} from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { getAdminAIModelRuntimeCapabilityLabel, formatDateTime } from "@/features/admin-ai/lib/view-model"
import { ActiveStateBadge, ListPageHeader } from "./shared"

type EditState = {
  setting: AdminAIMediaTranscriptionSettingItem
  modelId: string
  isEnabled: boolean
  changeReason: string
}

function modelLabel(model: AdminAIMediaModelOption) {
  const capabilities = model.runtimeCapabilities.length
    ? model.runtimeCapabilities.map(getAdminAIModelRuntimeCapabilityLabel).join("/")
    : "无用途"
  return `${model.displayName} · ${model.providerCode} · ${capabilities}`
}

export function MediaTranscriptionSettings() {
  const [data, setData] = useState<AdminAIMediaTranscriptionSettingsResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [detailItem, setDetailItem] = useState<AdminAIMediaTranscriptionSettingItem | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminAIMediaTranscriptionSettingsResponseData>(
        "/admin/ai/media/transcription-settings",
        { method: "GET" },
        "获取转译设置失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取转译设置失败"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const modelOptions = useMemo(() => {
    const base = [{ value: "", label: "不选择模型" }]
    return [
      ...base,
      ...(data?.modelOptions ?? []).map((model) => ({
        value: model.modelId,
        label: modelLabel(model),
      })),
    ]
  }, [data?.modelOptions])

  async function saveEdit() {
    if (!editState) {
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminAIMediaTranscriptionSettingUpdateResponseData>(
        `/admin/ai/media/transcription-settings/${editState.setting.settingId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            modelId: editState.modelId || null,
            isEnabled: editState.isEnabled,
            version: editState.setting.version,
            changeReason: editState.changeReason,
          }),
        },
        "保存转译设置失败",
      )
      setData((prev) => prev
        ? {
            ...prev,
            items: prev.items.map((item) => (
              item.settingId === result.setting.settingId ? result.setting : item
            )),
          }
        : prev)
      setEditState(null)
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      setError(getAdminApiErrorMessage(saveError, "保存转译设置失败"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="转译设置"
        description="为图片转译、语音转文本、文本转语音配置后台可选模型；文本转语音用于用户端 AI 回复播读。"
        total={data?.items.length}
        action={(
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchSettings()}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        )}
      />

      {error ? (
        <StatePanel status="error" title="转译设置操作失败" description={error} />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && !data ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : data?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="w-[26%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">类型</th>
                  <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">当前模型</th>
                  <th className="w-[11%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Provider / 用途</th>
                  <th className="w-[9%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                  <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">更新时间</th>
                  <th className="w-[18%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item) => (
                  <tr key={item.settingId} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-foreground">{item.modelDisplayName ?? "未选择模型"}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{item.modelCode ?? "model_id = null"}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-foreground">{item.providerName ?? "未绑定 Provider"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.requiredCapability ? getAdminAIModelRuntimeCapabilityLabel(item.requiredCapability) : "无强制用途"}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <ActiveStateBadge active={item.isEnabled} activeLabel="开启" inactiveLabel="停用" />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-foreground">{formatDateTime(item.updatedAt)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">版本 {item.version}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" onClick={() => setDetailItem(item)}>
                          <Eye className="h-3.5 w-3.5" />
                          详情
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1.5 px-2.5"
                          onClick={() => setEditState({
                            setting: item,
                            modelId: item.modelId ?? "",
                            isEnabled: item.isEnabled,
                            changeReason: "",
                          })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          编辑
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <StatePanel status="empty" title="暂无转译设置" description="数据库尚未初始化多媒体转译设置。" />
          </div>
        )}
      </div>

      <Dialog open={Boolean(detailItem)} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailItem?.label ?? "转译设置详情"}</DialogTitle>
            <DialogDescription>{detailItem?.description}</DialogDescription>
          </DialogHeader>
          {detailItem ? (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">模型：</span>{detailItem.modelDisplayName ?? "未选择"}</p>
              <p><span className="text-muted-foreground">Provider：</span>{detailItem.providerName ?? "未绑定"}</p>
              <p><span className="text-muted-foreground">状态：</span>{detailItem.isEnabled ? "开启" : "停用"}</p>
              <p><span className="text-muted-foreground">更新时间：</span>{formatDateTime(detailItem.updatedAt)}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(editState)} onOpenChange={(open) => !open && setEditState(null)}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>编辑转译设置</SheetTitle>
            <SheetDescription>{editState?.setting.label ?? ""}</SheetDescription>
          </SheetHeader>
          {editState ? (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">使用模型</span>
                <AdminSelect
                  value={editState.modelId}
                  onValueChange={(value) => setEditState((prev) => prev ? { ...prev, modelId: value } : prev)}
                  options={modelOptions}
                  triggerClassName="w-full"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 px-3 py-3">
                <span>
                  <span className="block text-sm font-medium text-foreground">开启/停用</span>
                  <span className="block text-xs text-muted-foreground">停用后运行时不会调用该类型转译模型。</span>
                </span>
                <Switch
                  checked={editState.isEnabled}
                  onCheckedChange={(checked) => setEditState((prev) => prev ? { ...prev, isEnabled: checked } : prev)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">变更原因</span>
                <textarea
                  value={editState.changeReason}
                  onChange={(event) => setEditState((prev) => prev ? { ...prev, changeReason: event.target.value } : prev)}
                  className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="说明本次模型或状态调整原因"
                />
              </label>
            </div>
          ) : null}
          <SheetFooter>
            <Button type="button" className="gap-1.5" disabled={!editState?.changeReason.trim() || isSaving} onClick={() => void saveEdit()}>
              <Save className="h-4 w-4" />
              {isSaving ? "保存中…" : "保存"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default MediaTranscriptionSettings
