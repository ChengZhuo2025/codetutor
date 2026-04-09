import { Icon } from "@iconify/react/offline"
import { CheckCircle2 } from "lucide-react"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import { cn } from "@/lib/utils"
import type { Badge } from "@/features/achievement/types"

type BadgeGridProps = {
  badges: Badge[]
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const earnedBadges = badges.filter((badge) => badge.earned)

  if (badges.length === 0) {
    return (
      <StatePanel
        status="empty"
        title="还没有成就徽章"
        description="随着关卡推进、连续学习和专项突破，这里会逐步解锁新的成就。"
      />
    )
  }

  return (
    <PageSection
      eyebrow="成长身份"
      title="成就徽章"
      description={
        <>
          已获得{" "}
          <span className="font-semibold text-brand">
            {earnedBadges.length}
          </span>{" "}
          / {badges.length} 枚，已解锁徽章高亮显示，未解锁徽章显示为灰色。
        </>
      }
      bodyClassName="pt-5"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => {
          const badgeIcon = badge.icon

          return (
            <div
              key={badge.id}
              className={cn(
                "relative overflow-hidden rounded-[26px] border p-5 transition-transform duration-200 hover:-translate-y-0.5",
                badge.earned
                  ? "border-brand/28 bg-[linear-gradient(180deg,rgba(244,251,248,0.98),rgba(235,246,241,0.95))] text-brand shadow-[0_18px_48px_-34px_rgba(15,23,42,0.2)] dark:bg-brand/18"
                  : "border-border/70 bg-surface-1/95 text-muted-foreground shadow-[0_14px_36px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-white/5",
              )}
            >
              {badge.earned ? (
                <CheckCircle2 className="absolute right-4 top-4 h-4 w-4 text-brand" />
              ) : null}

              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border",
                    badge.earned
                      ? "border-brand/22 bg-brand/10 dark:bg-brand/16"
                      : "border-border/70 bg-muted/60 dark:border-white/10 dark:bg-white/6",
                  )}
                >
                  <Icon
                    icon={badgeIcon}
                    width={24}
                    height={24}
                    className={cn(
                      "block",
                      badge.earned ? "text-brand" : "text-muted-foreground/45",
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      badge.earned ? "text-brand" : "text-foreground/80",
                    )}
                  >
                    {badge.title}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-sm leading-6",
                      badge.earned ? "text-brand/80" : "text-muted-foreground/80",
                    )}
                  >
                    {badge.desc}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </PageSection>
  )
}
