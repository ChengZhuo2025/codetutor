"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type WorkspacePageKey = "learn" | "map" | "achievements" | "history"

type RightCollapsedByPage = Record<WorkspacePageKey, boolean>

type WorkspaceLayoutContextValue = {
  leftCollapsed: boolean
  toggleLeftCollapsed: () => void
  isRightCollapsed: (page: WorkspacePageKey) => boolean
  setRightCollapsed: (page: WorkspacePageKey, collapsed: boolean) => void
  toggleRightCollapsed: (page: WorkspacePageKey) => void
}

const LEFT_COLLAPSED_STORAGE_KEY = "workspace:left-collapsed"
const RIGHT_COLLAPSED_STORAGE_KEY = "workspace:right-collapsed-by-page"

const DEFAULT_RIGHT_COLLAPSED_BY_PAGE: RightCollapsedByPage = {
  learn: false,
  map: false,
  achievements: false,
  history: false,
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | null>(null)

function readLeftCollapsedFromStorage() {
  if (typeof window === "undefined") {
    return false
  }

  try {
    return window.localStorage.getItem(LEFT_COLLAPSED_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function readRightCollapsedFromStorage(): RightCollapsedByPage {
  if (typeof window === "undefined") {
    return DEFAULT_RIGHT_COLLAPSED_BY_PAGE
  }

  try {
    const raw = window.localStorage.getItem(RIGHT_COLLAPSED_STORAGE_KEY)

    if (!raw) {
      return DEFAULT_RIGHT_COLLAPSED_BY_PAGE
    }

    const parsed = JSON.parse(raw) as Partial<RightCollapsedByPage>

    return {
      ...DEFAULT_RIGHT_COLLAPSED_BY_PAGE,
      ...parsed,
    }
  } catch {
    return DEFAULT_RIGHT_COLLAPSED_BY_PAGE
  }
}

export function WorkspaceLayoutProvider({ children }: { children: ReactNode }) {
  const [leftCollapsed, setLeftCollapsed] = useState(() => readLeftCollapsedFromStorage())
  const [rightCollapsedByPage, setRightCollapsedByPage] = useState<RightCollapsedByPage>(() =>
    readRightCollapsedFromStorage(),
  )

  const toggleLeftCollapsed = useCallback(() => {
    setLeftCollapsed((current) => {
      const next = !current

      try {
        window.localStorage.setItem(LEFT_COLLAPSED_STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }

      return next
    })
  }, [])

  const setRightCollapsed = useCallback((page: WorkspacePageKey, collapsed: boolean) => {
    setRightCollapsedByPage((current) => {
      const next = {
        ...current,
        [page]: collapsed,
      }

      try {
        window.localStorage.setItem(RIGHT_COLLAPSED_STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }

      return next
    })
  }, [])

  const toggleRightCollapsed = useCallback(
    (page: WorkspacePageKey) => {
      setRightCollapsed(page, !rightCollapsedByPage[page])
    },
    [rightCollapsedByPage, setRightCollapsed],
  )

  const value = useMemo<WorkspaceLayoutContextValue>(
    () => ({
      leftCollapsed,
      toggleLeftCollapsed,
      isRightCollapsed: (page) => rightCollapsedByPage[page],
      setRightCollapsed,
      toggleRightCollapsed,
    }),
    [leftCollapsed, rightCollapsedByPage, setRightCollapsed, toggleLeftCollapsed, toggleRightCollapsed],
  )

  return <WorkspaceLayoutContext.Provider value={value}>{children}</WorkspaceLayoutContext.Provider>
}

export function useWorkspaceLayout() {
  const context = useContext(WorkspaceLayoutContext)

  if (!context) {
    throw new Error("useWorkspaceLayout must be used within WorkspaceLayoutProvider")
  }

  return context
}
