"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ConfirmInputConfig = {
  label: string
  placeholder?: string
  defaultValue?: string
  multiline?: boolean
  required?: boolean
}

type AppConfirmOptions = {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  input?: ConfirmInputConfig
}

type PromptConfirmResult = {
  confirmed: boolean
  value: string
}

type ConfirmRequest = AppConfirmOptions & {
  resolve: (result: PromptConfirmResult) => void
}

type AppConfirmContextValue = {
  confirm: (options: AppConfirmOptions) => Promise<boolean>
  prompt: (options: AppConfirmOptions) => Promise<PromptConfirmResult>
}

type AppConfirmProviderProps = {
  children: React.ReactNode
}

const AppConfirmContext = createContext<AppConfirmContextValue | null>(null)

export function AppConfirmProvider({ children }: AppConfirmProviderProps) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [inputValue, setInputValue] = useState("")

  const closeRequest = useCallback((result: PromptConfirmResult) => {
    const currentRequest = request
    setRequest(null)
    setInputValue("")
    currentRequest?.resolve(result)
  }, [request])

  const openRequest = useCallback((options: AppConfirmOptions) => new Promise<PromptConfirmResult>((resolve) => {
    setInputValue(options.input?.defaultValue ?? "")
    setRequest({
      ...options,
      resolve,
    })
  }), [])

  const contextValue = useMemo<AppConfirmContextValue>(() => ({
    confirm: async (options) => {
      const result = await openRequest(options)
      return result.confirmed
    },
    prompt: (options) => openRequest(options),
  }), [openRequest])

  const confirmDisabled = Boolean(request?.input?.required && !inputValue.trim())

  return (
    <AppConfirmContext.Provider value={contextValue}>
      {children}
      <Dialog
        open={Boolean(request)}
        onOpenChange={(open) => {
          if (!open && request) {
            closeRequest({
              confirmed: false,
              value: inputValue,
            })
          }
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-[min(92vw,30rem)] p-0">
          <div className="px-6 py-5">
            <DialogHeader className="gap-3 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-300">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <DialogTitle>{request?.title ?? ""}</DialogTitle>
                  {request?.description ? (
                    <DialogDescription className="leading-6">
                      {request.description}
                    </DialogDescription>
                  ) : null}
                </div>
              </div>
            </DialogHeader>

            {request?.input ? (
              <div className="mt-5 space-y-2">
                <Label htmlFor="app-confirm-input">{request.input.label}</Label>
                {request.input.multiline ? (
                  <Textarea
                    id="app-confirm-input"
                    rows={4}
                    value={inputValue}
                    placeholder={request.input.placeholder}
                    onChange={(event) => setInputValue(event.target.value)}
                  />
                ) : (
                  <Input
                    id="app-confirm-input"
                    value={inputValue}
                    placeholder={request.input.placeholder}
                    onChange={(event) => setInputValue(event.target.value)}
                  />
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeRequest({ confirmed: false, value: inputValue })}
            >
              {request?.cancelText ?? "取消"}
            </Button>
            <Button
              type="button"
              variant={request?.destructive ? "destructive" : "default"}
              disabled={confirmDisabled}
              onClick={() => {
                closeRequest({
                  confirmed: true,
                  value: inputValue,
                })
              }}
            >
              {request?.confirmText ?? "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppConfirmContext.Provider>
  )
}

export function useAppConfirm() {
  const context = useContext(AppConfirmContext)

  if (!context) {
    throw new Error("useAppConfirm must be used within AppConfirmProvider")
  }

  return context
}
