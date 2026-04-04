"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type AppToastTone = "success" | "error" | "info"

type AppToastOptions = {
  title: string
  description?: string
  tone?: AppToastTone
  duration?: number
}

type AppToast = AppToastOptions & {
  id: string
  tone: AppToastTone
  visible: boolean
}

type AppToastContextValue = {
  showToast: (options: AppToastOptions) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

type AppToastProviderProps = {
  children: React.ReactNode
}

const APP_TOAST_DURATION = 3200
const EXIT_ANIMATION_MS = 220

const AppToastContext = createContext<AppToastContextValue | null>(null)

function getToastMeta(tone: AppToastTone) {
  switch (tone) {
    case "success":
      return {
        icon: CheckCircle2,
        className:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
        iconClassName: "text-emerald-600 dark:text-emerald-300",
      }
    case "error":
      return {
        icon: AlertCircle,
        className: "border-destructive/25 bg-destructive/10 text-foreground",
        iconClassName: "text-destructive",
      }
    default:
      return {
        icon: Info,
        className: "border-border bg-card/95 text-foreground",
        iconClassName: "text-primary",
      }
  }
}

export function AppToastProvider({ children }: AppToastProviderProps) {
  const [toasts, setToasts] = useState<AppToast[]>([])
  const dismissTimersRef = useRef<Map<string, number>>(new Map())
  const cleanupTimersRef = useRef<Map<string, number>>(new Map())

  const removeToast = useCallback((id: string) => {
    const dismissTimer = dismissTimersRef.current.get(id)
    if (dismissTimer) {
      window.clearTimeout(dismissTimer)
      dismissTimersRef.current.delete(id)
    }

    const cleanupTimer = cleanupTimersRef.current.get(id)
    if (cleanupTimer) {
      window.clearTimeout(cleanupTimer)
      cleanupTimersRef.current.delete(id)
    }

    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.map((toast) => (
      toast.id === id
        ? {
            ...toast,
            visible: false,
          }
        : toast
    )))

    const existingCleanupTimer = cleanupTimersRef.current.get(id)
    if (existingCleanupTimer) {
      window.clearTimeout(existingCleanupTimer)
    }

    const cleanupTimer = window.setTimeout(() => {
      cleanupTimersRef.current.delete(id)
      removeToast(id)
    }, EXIT_ANIMATION_MS)

    cleanupTimersRef.current.set(id, cleanupTimer)
  }, [removeToast])

  const showToast = useCallback((options: AppToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const nextToast: AppToast = {
      id,
      title: options.title,
      description: options.description,
      tone: options.tone ?? "info",
      visible: true,
      duration: options.duration ?? APP_TOAST_DURATION,
    }

    setToasts((current) => [nextToast, ...current].slice(0, 4))

    const dismissTimer = window.setTimeout(() => {
      dismissTimersRef.current.delete(id)
      dismissToast(id)
    }, nextToast.duration ?? APP_TOAST_DURATION)

    dismissTimersRef.current.set(id, dismissTimer)
  }, [dismissToast])

  useEffect(() => () => {
    dismissTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    cleanupTimersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const contextValue = useMemo<AppToastContextValue>(() => ({
    showToast,
    success: (title, description) => showToast({ title, description, tone: "success" }),
    error: (title, description) => showToast({ title, description, tone: "error" }),
    info: (title, description) => showToast({ title, description, tone: "info" }),
  }), [showToast])

  return (
    <AppToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-4">
        <div className="flex w-full max-w-xl flex-col items-center gap-2">
          {toasts.map((toast) => {
            const meta = getToastMeta(toast.tone)
            const Icon = meta.icon

            return (
              <div
                key={toast.id}
                className={cn(
                  "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md transition-all duration-200",
                  toast.visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
                  meta.className,
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.iconClassName)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppToastContext.Provider>
  )
}

export function useAppToast() {
  const context = useContext(AppToastContext)

  if (!context) {
    throw new Error("useAppToast must be used within AppToastProvider")
  }

  return context
}
