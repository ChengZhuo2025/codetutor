import { AlertTriangle, BookMarked, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stage } from "@/features/progress/types"

type StageDetailPanelProps = {
  stage: Stage
}

export function StageDetailPanel({ stage }: StageDetailPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="sticky top-0">
        <div className="mb-4 flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-foreground">关键知识点</span>
          <span className="ml-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted-foreground">
            第 {stage.id} 关
          </span>
        </div>

        <div className="mb-4 rounded-xl border border-border/50 bg-surface-2 px-4 py-3">
          <p className="mb-0.5 text-xs text-muted-foreground">当前查看</p>
          <p className="text-sm font-semibold">{stage.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{stage.desc}</p>
        </div>

        <div className="mb-4 rounded-xl border border-border/50 bg-surface-2 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs font-semibold text-gold">本关要掌握</span>
          </div>
          <ul className="space-y-2.5">
            {stage.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                  {index + 1}
                </div>
                <span className="text-xs leading-relaxed text-foreground/85">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface-2 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive/80">注意事项</span>
          </div>
          <ul className="space-y-2.5">
            {stage.pitfalls.map((pitfall, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    pitfall.isTrap ? "bg-destructive" : "bg-muted-foreground/50",
                  )}
                />
                <div className="flex-1">
                  {pitfall.isTrap && (
                    <span className="mr-1.5 inline-block rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      卡点提醒
                    </span>
                  )}
                  <span className="text-xs leading-relaxed text-foreground/80">
                    {pitfall.text}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
