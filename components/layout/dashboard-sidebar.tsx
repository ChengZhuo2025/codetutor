"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ChevronRight,
  Code2,
  Crown,
  Flame,
  Star,
} from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { ROUTES } from "@/constants/routes"
import { ProfileEditDialog } from "@/components/layout/profile-edit-dialog"
import { SubscriptionDetailDialog } from "@/components/layout/subscription-detail-dialog"
import { SettingsPopover } from "@/components/layout/settings-popover"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { requestData } from "@/lib/api/client"
import { PROFILE_UPDATED_EVENT } from "@/lib/profile/events"
import { cn } from "@/lib/utils"
import type { RecentPracticeRound } from "@/features/learning/types"
import type { DashboardNavItem } from "@/types/navigation"
import type { SubscriptionSnapshot } from "@/types/profile"

type DashboardSidebarProps = {
  items: DashboardNavItem[]
  widthClass?: string
  showSettings?: boolean
  className?: string
  children?: React.ReactNode
  footerContent?: React.ReactNode
}

const SUBSCRIPTION_PLACEHOLDER: SubscriptionSnapshot = {
  planName: "个人版",
  planPriceLabel: "¥39/月",
  billingCycleLabel: "按月订阅",
  expiresAt: "待接入",
  remainingDays: 0,
  quotaLabel: "支付与订阅接口待接入",
  renewalHint: "当前为产品原型阶段，订阅信息仍使用静态占位。",
  primaryActionLabel: "升级套餐",
  secondaryActionLabel: "立即续费",
}

export function DashboardSidebar({
  items,
  widthClass = "w-64",
  showSettings = true,
  className,
  children,
  footerContent,
}: DashboardSidebarProps) {
  const [profile, setProfile] = useState<ProfileMeResponseData | null>(null)
  const [recentPracticeRounds, setRecentPracticeRounds] = useState<RecentPracticeRound[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileFeedbackMessage, setProfileFeedbackMessage] = useState<string | null>(null)

  const handleProfileSaved = (nextProfile: ProfileMeResponseData) => {
    setProfile(nextProfile)
    setProfileFeedbackMessage("个人资料已保存")
  }

  useEffect(() => {
    if (!profileFeedbackMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setProfileFeedbackMessage(null)
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [profileFeedbackMessage])

  useEffect(() => {
    let cancelled = false

    async function loadSidebarData() {
      try {
        const session = await requestData<LearningCurrentSessionResponseData>("/learning/current-session")

        if (cancelled) {
          return
        }

        setProfile(session.profile)
        setRecentPracticeRounds(session.recentPracticeRounds)
        return
      } catch {
        // fall back to profile-only mode when there is no active learning session
      }

      try {
        const profileData = await requestData<ProfileMeResponseData>("/profile/me")

        if (cancelled) {
          return
        }

        setProfile(profileData)
        setRecentPracticeRounds([])
      } catch {
        if (cancelled) {
          return
        }

        setProfile(null)
        setRecentPracticeRounds([])
      }
    }

    function handleProfileUpdated(event: Event) {
      const nextProfile = (event as CustomEvent<ProfileMeResponseData>).detail
      setProfile(nextProfile)
    }

    void loadSidebarData()
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener)

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener)
    }
  }, [])

  const displayProfile = profile ?? {
    userId: "loading",
    nickname: "加载中",
    avatarUrl: null,
    phone: null,
    email: null,
    wechat: null,
    bio: null,
    primaryTool: {
      code: "unselected",
      name: "未选择",
    },
    learningLevel: "beginner",
    currentScore: 0,
    currentRank: "待同步",
    streakDays: 0,
    completedTaskCount: 0,
    lastLearningAt: new Date(0).toISOString(),
  }
  const subscription = SUBSCRIPTION_PLACEHOLDER
  const progressPercent = Math.min(Math.round((displayProfile.currentScore / 1000) * 100), 100)
  const visiblePracticeRounds = recentPracticeRounds.slice(0, 5)

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-border/50 bg-sidebar",
        widthClass,
        className,
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">{APP_NAME}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <div className="space-y-4 px-4 py-4">
          <div className="rounded-[24px] border border-border/50 bg-surface-3 p-4">
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dim text-md font-bold text-brand transition-opacity hover:opacity-80"
              >
                {displayProfile.avatarUrl ? (
                  <Image
                    src={displayProfile.avatarUrl}
                    alt={displayProfile.nickname}
                    width={44}
                    height={44}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  displayProfile.nickname.slice(0, 1)
                )}
              </button>
              <SubscriptionDetailDialog subscription={subscription}>
                <div className="min-w-0 flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-md font-semibold text-foreground">
                      {displayProfile.nickname}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold-dim px-1.5 py-0.5 text-[10px] font-medium text-gold">
                      <Crown className="h-2.5 w-2.5" />
                      {subscription.planName}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    有效期至 {subscription.expiresAt}
                  </p>
                </div>
              </SubscriptionDetailDialog>
            </div>

            <Link
              href={ROUTES.achievements}
              className="block rounded-xl transition-colors hover:bg-background/40 -mx-1 px-1 py-1"
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{displayProfile.currentScore} / 1000 XP</span>
                <span className="text-muted-foreground">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
                <div className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5">
                  <Flame className="h-4 w-4 text-gold" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">连续学习</p>
                    <p className="text-sm font-bold text-gold">{displayProfile.streakDays} 天</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5">
                  <Star className="h-4 w-4 text-brand" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">已完成</p>
                    <p className="text-sm font-bold">{displayProfile.completedTaskCount} 关</p>
                  </div>
                </div>
              </div>
            </Link>

            {profileFeedbackMessage ? (
              <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {profileFeedbackMessage}
              </div>
            ) : null}
          </div>

          <ProfileEditDialog
            open={profileOpen}
            onOpenChange={setProfileOpen}
            onSaved={handleProfileSaved}
          />

          <nav className="space-y-1 rounded-[24px] border border-border/60 bg-surface-2/80 p-2">
            {items.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-brand-dim text-brand"
                      : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="rounded-[24px] border border-border/60 bg-surface-2/80 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/55">
                最近学习
              </p>
              <Link
                href={ROUTES.history}
                className="flex items-center gap-1 text-[12px] text-brand transition-colors hover:text-brand/80"
              >
                查看更多
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {visiblePracticeRounds.length > 0 ? (
              <div className="space-y-1">
                {visiblePracticeRounds.map((practiceRound) => (
                  <button
                    key={practiceRound.id}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-3"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <div
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          practiceRound.status === "completed"
                            ? "bg-brand"
                            : practiceRound.status === "in_progress"
                              ? "bg-gold"
                              : "bg-muted-foreground/40",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground/55">
                          {practiceRound.stageLabel}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {practiceRound.taskTitle}
                        </p>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground/55">
                      {practiceRound.lastActiveLabel}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
                当前还没有最近学习记录。开始一条学习计划后，这里会显示你的最新关卡进度。
              </div>
            )}
          </div>

          {children ? <div className="space-y-3">{children}</div> : null}

          {footerContent ? (
            <div className="rounded-[24px] border border-border/60 bg-surface-2/80 p-4">
              {footerContent}
            </div>
          ) : null}
        </div>
      </div>

      {showSettings && (
        <div className="shrink-0 border-t border-border/50 px-4 py-2.5">
          <SettingsPopover onProfileSaved={handleProfileSaved} />
        </div>
      )}
    </aside>
  )
}
