import { TrendingUp, Zap } from "lucide-react"
import { WorkspaceAside } from "@/components/layout/workspace-aside"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import type { XpGuideItem, XpHistoryItem } from "@/features/achievement/types"
import { cn } from "@/lib/utils"

type AchievementSidebarPanelsProps = {
  guideItems: XpGuideItem[]
  historyItems: XpHistoryItem[]
  totalXP: number
  className?: string
}

export function AchievementSidebarPanels({
  guideItems,
  historyItems,
  totalXP,
  className,
}: AchievementSidebarPanelsProps) {
  return (
    <WorkspaceAside as="div" className={cn("gap-4", className)}>
      <PageSection
        eyebrow="成长规则"
        title="XP 获取方式"
        description="完成关卡获得 XP，保持连续学习也有额外奖励，积累足够 XP 可晋升段位。"
        action={<TrendingUp className="h-4 w-4 text-brand" />}
        className="border-border/70 bg-surface-1/95 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5"
      >
        {guideItems.length > 0 ? (
          <ul className="space-y-3">
            {guideItems.map((item) => (
              <li key={item.label} className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground/70">{item.desc}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-xs font-bold ${item.color}`}
                >
                  {item.xp}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <StatePanel
            status="empty"
            title="暂无 XP 规则"
            description="开始学习后，这里会展示不同学习动作对应的 XP 收益。"
            compact
          />
        )}
      </PageSection>

      <PageSection
        eyebrow="成长记录"
        title="XP 流水"
        action={<Zap className="h-4 w-4 text-gold" />}
        className="border-border/70 bg-surface-1/95 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/5"
      >
        {historyItems.length > 0 ? (
          <>
            <ul className="space-y-3">
              {historyItems.map((item, index) => (
                <li key={index} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{item.label}</p>
                    <p className="text-muted-foreground/70">{item.time}</p>
                  </div>
                  <span
                    className={`shrink-0 font-bold ${
                      item.type === "bonus" || item.type === "badge"
                        ? "text-gold"
                        : item.type === "checkin"
                          ? "text-chart-3"
                          : "text-brand"
                    }`}
                  >
                    {item.xp} XP
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border/40 pt-3 text-right text-xs text-muted-foreground">
              累计 <span className="font-bold text-foreground">{totalXP} XP</span>
            </p>
          </>
        ) : (
          <StatePanel
            status="empty"
            title="暂无 XP 记录"
            description="完成关卡、连续打卡和获得徽章后，这里会出现你最近的成长记录。"
            compact
          />
        )}
      </PageSection>
    </WorkspaceAside>
  )
}
