import { TrendingUp, Zap } from "lucide-react"
import type {
  XpGuideItem,
  XpHistoryItem,
} from "@/features/achievement/types"

type AchievementSidebarPanelsProps = {
  guideItems: XpGuideItem[]
  historyItems: XpHistoryItem[]
}

export function AchievementSidebarPanels({
  guideItems,
  historyItems,
}: AchievementSidebarPanelsProps) {
  return (
    <div className="w-80 shrink-0 space-y-5 overflow-y-auto border-l border-border/50 px-5 py-8">
      <div className="rounded-2xl border border-border/60 bg-surface-2 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-brand" />
          进阶攻略
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          学分（XP）是你在 CodeTutor 的成长积累，以下方式均可获得：
        </p>
        <ul className="space-y-3">
          {guideItems.map((item) => (
            <li key={item.label} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground/70">{item.desc}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-xs font-bold ${item.color}`}
              >
                {item.xp}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface-2 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-gold" />
          XP 获取记录
        </h3>
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
                {item.xp}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-border/40 pt-3 text-right text-xs text-muted-foreground">
          累计 <span className="font-bold text-foreground">680</span> XP
        </p>
      </div>
    </div>
  )
}
