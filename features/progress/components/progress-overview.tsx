import { Zap } from "lucide-react"

type ProgressOverviewProps = {
  done: number
  total: number
}

export function ProgressOverview({ done, total }: ProgressOverviewProps) {
  return (
    <div className="shrink-0 border-b border-border/40 px-6 py-4">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface-2 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Cursor 学习路径</p>
            <p className="mt-0.5 text-xl font-bold">
              {Math.round((done / total) * 100)}% 完成
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold-dim px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-gold" />
            <span className="text-sm font-bold text-gold">120 / 180 XP</span>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-4">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>萌新码农</span>
          <span>AI 学徒</span>
        </div>
      </div>
    </div>
  )
}
