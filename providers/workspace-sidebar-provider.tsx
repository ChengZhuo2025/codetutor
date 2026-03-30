"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { requestData } from "@/lib/api/client"
import { PROFILE_UPDATED_EVENT } from "@/lib/profile/events"
import type { RecentPracticeRound } from "@/features/learning/types"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type WorkspaceSidebarDataState = {
  profile: ProfileMeResponseData | null
  recentPracticeRounds: RecentPracticeRound[]
  hasLoaded: boolean
}

type WorkspaceSidebarDataContextValue = WorkspaceSidebarDataState & {
  updateProfile: (profile: ProfileMeResponseData) => void
  refresh: () => Promise<void>
}

const WorkspaceSidebarDataContext =
  createContext<WorkspaceSidebarDataContextValue | null>(null)

async function fetchWorkspaceSidebarData(): Promise<WorkspaceSidebarDataState> {
  try {
    const session = await requestData<LearningCurrentSessionResponseData>("/learning/current-session")

    return {
      profile: session.profile,
      recentPracticeRounds: session.recentPracticeRounds,
      hasLoaded: true,
    }
  } catch {
    // fall back to profile-only mode when there is no active learning session
  }

  try {
    const profile = await requestData<ProfileMeResponseData>("/profile/me")

    return {
      profile,
      recentPracticeRounds: [],
      hasLoaded: true,
    }
  } catch {
    return {
      profile: null,
      recentPracticeRounds: [],
      hasLoaded: true,
    }
  }
}

export function WorkspaceSidebarDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceSidebarDataState>({
    profile: null,
    recentPracticeRounds: [],
    hasLoaded: false,
  })

  async function refresh() {
    const nextState = await fetchWorkspaceSidebarData()
    setState(nextState)
  }

  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()

    async function load() {
      const nextState = await fetchWorkspaceSidebarData()

      if (!cancelled) {
        setState(nextState)
      }
    }

    function handleProfileUpdated(event: Event) {
      const nextProfile = (event as CustomEvent<ProfileMeResponseData>).detail

      setState((current) => ({
        ...current,
        profile: nextProfile,
        hasLoaded: true,
      }))
    }

    void load()
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        setState({
          profile: null,
          recentPracticeRounds: [],
          hasLoaded: true,
        })
        return
      }

      void load()
    })

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener)
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<WorkspaceSidebarDataContextValue>(
    () => ({
      ...state,
      updateProfile: (profile) => {
        setState((current) => ({
          ...current,
          profile,
          hasLoaded: true,
        }))
      },
      refresh,
    }),
    [state],
  )

  return (
    <WorkspaceSidebarDataContext.Provider value={value}>
      {children}
    </WorkspaceSidebarDataContext.Provider>
  )
}

export function useWorkspaceSidebarData() {
  const context = useContext(WorkspaceSidebarDataContext)

  if (!context) {
    throw new Error("useWorkspaceSidebarData must be used within WorkspaceSidebarDataProvider")
  }

  return context
}
