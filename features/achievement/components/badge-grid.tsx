import { Lock } from "lucide-react"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import { cn } from "@/lib/utils"
import type { Badge } from "@/features/achievement/types"

type BadgeGridProps = {
  badges: Badge[]
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const earnedBadges = badges.filter((badge) => badge.earned)
  const lockedBadges = badges.filter((badge) => !badge.earned)

  if (badges.length === 0) {
    return (
      <StatePanel
        status="empty"
        title="还没有成就徽章"
        description="随着关卡推进、连续学习和专项突破，这里会逐步解锁新的身份标签。"
      />
    )
  }

  return (
    <PageSection
      eyebrow="成长身份"
      title="成就徽章"
      description={`已获得 ${earnedBadges.length} / ${badges.length} 枚，成长会继续解锁新的身份标签。`}
    >
      <div className="space-y-5">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
            已获得
          </p>
          {earnedBadges.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {earnedBadges.map((badge) => {
                const Icon = badge.icon

                return (
                  <div
                    key={badge.id}
                    className={cn("rounded-[24px] border p-4", badge.color)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-current/5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{badge.title}</p>
                          <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
                            已获得
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-6 opacity-80">{badge.desc}</p>
                        {badge.progressHint ? (
                          <p className="mt-2 text-xs font-medium opacity-90">{badge.progressHint}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <StatePanel
              status="empty"
              title="还没有已获得徽章"
              description="继续完成当前学习路径后，第一批徽章会先从基础连续学习和首个关卡完成开始解锁。"
              compact
            />
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
            即将解锁
          </p>
          {lockedBadges.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-[24px] border border-border/40 bg-surface-3 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-background/40">
                      <Lock className="h-4 w-4 text-muted-foreground/55" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{badge.title}</p>
                        <span className="rounded-full border border-border/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
                          未解锁
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{badge.desc}</p>
                      {badge.progressHint ? (
                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                          {badge.progressHint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StatePanel
              status="success"
              title="当前批次徽章已全部解锁"
              description="继续推进路径后，后续会开放更高阶的专项徽章。"
              compact
            />
          )}
        </div>
      </div>
    </PageSection>
  )
}
