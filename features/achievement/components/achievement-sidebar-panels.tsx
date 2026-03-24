import { TrendingUp, Zap } from "lucide-react"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import type { XpGuideItem, XpHistoryItem } from "@/features/achievement/types"
import { cn } from "@/lib/utils"

type AchievementSidebarPanelsProps = {
  guideItems: XpGuideItem[]
  historyItems: XpHistoryItem[]
  className?: string
}

export function AchievementSidebarPanels({
  guideItems,
  historyItems,
  className,
}: AchievementSidebarPanelsProps) {
  return (
    <div className={cn("space-y-5 overflow-y-auto px-5 py-6 sm:px-6 sm:py-8", className)}>
      <PageSection
        eyebrow="成长规则"
        title="XP 获取方式"
        description="XP 不是单独的积分系统，它直接对应你的关卡推进、连续学习和徽章成长。"
        action={<TrendingUp className="h-4 w-4 text-brand" />}
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
            title="暂时没有 XP 规则说明"
            description="接入真实规则配置后，这里会展示不同学习动作对应的 XP 收益。"
            compact
          />
        )}
      </PageSection>

      <PageSection
        eyebrow="成长记录"
        title="XP 流水"
        action={<Zap className="h-4 w-4 text-gold" />}
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
              累计 <span className="font-bold text-foreground">680 XP</span>
            </p>
          </>
        ) : (
          <StatePanel
            status="empty"
            title="还没有 XP 流水"
            description="开始学习、完成关卡和保持连续打卡后，这里会出现最近的成长记录。"
            compact
          />
        )}
      </PageSection>
    </div>
  )
}
