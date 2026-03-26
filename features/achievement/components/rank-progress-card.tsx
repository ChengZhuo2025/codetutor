import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AchievementOverview, Rank } from "@/features/achievement/types";

type RankProgressCardProps = {
  currentXP: number;
  currentRankIdx: number;
  ranks: Rank[];
  overview: AchievementOverview;
  onContinueLearning: () => void;
  onOpenMap: () => void;
};

export function RankProgressCard({
  currentXP,
  currentRankIdx,
  ranks,
  overview,
  onContinueLearning,
  onOpenMap,
}: RankProgressCardProps) {
  const currentRank = ranks[currentRankIdx];
  const nextRank = ranks[currentRankIdx + 1];
  const currentRange = Math.max(currentRank.max - currentRank.min, 1);
  const progress = Math.min(
    100,
    Math.max(0, ((currentXP - currentRank.min) / currentRange) * 100),
  );

  return (
    <div className="overflow-hidden rounded-[34px] border border-brand/20 bg-[linear-gradient(135deg,rgba(18,30,34,0.96),rgba(12,22,26,0.96))] shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
      <div className="border-b border-brand/10  bg-[radial-gradient(circle_at_top_right,rgba(79,209,197,0.15),transparent_34%)] px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-brand/80">
          <Sparkles className="h-3.5 w-3.5" />
          当前段位
        </div>

        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-brand/30 bg-background/55 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {"</>"}
          </div>
          <div className="min-w-0">
            <h2 className="text-3xl font-bold tracking-tight text-brand">
              {currentRank.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              你已经累计 {overview.totalXP} XP，并保持了 {overview.streakDays}{" "}
              天连续学习。 继续推进当前路径，会最快把这条成长轨道往下一段点亮。
            </p>
          </div>
          <div className="flex flex-col gap-3 xl:w-[236px] xl:justify-self-end">
            <button
              onClick={onContinueLearning}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-brand-foreground shadow-[0_24px_60px_-28px_oklch(0.78_0.15_180/0.9)] transition-all hover:-translate-y-0.5 hover:bg-brand/90"
            >
              继续学习赚XP
            </button>
            <button
              onClick={onOpenMap}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/45 px-4 py-3.5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-background/60"
            >
              查看闯关地图
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
              段位进阶轨道
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              已达成段位用实线连接，未解锁段位保持虚线等待点亮。
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
              当前进度
            </p>
            <p className="mt-1 text-sm font-semibold text-brand">
              {Math.round(progress)}% 完成
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-5 sm:gap-0">
          {ranks.map((rank, index) => {
            const isCompleted = index < currentRankIdx;
            const isCurrent = index === currentRankIdx;
            const showPartialProgress = isCurrent && nextRank;

            return (
              <div key={rank.name} className="relative">
                {index < ranks.length - 1 ? (
                  <div className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[18px] hidden sm:block">
                    <div
                      className={cn(
                        "h-px border-t",
                        isCompleted
                          ? "border-brand/45"
                          : "border-dashed border-white/20",
                      )}
                    />
                    {showPartialProgress ? (
                      <div
                        className="absolute inset-y-0 left-0 border-t border-brand transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    ) : null}
                  </div>
                ) : null}

                <div className="relative flex flex-col items-start gap-3 sm:items-center sm:px-2">
                  <div
                    className={cn(
                      "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300",
                      isCurrent
                        ? "border-brand bg-brand text-brand-foreground shadow-[0_0_0_6px_rgba(79,209,197,0.14)]"
                        : isCompleted
                          ? "border-brand/35 bg-brand/15 text-brand"
                          : "border-border/40 bg-surface-3 text-muted-foreground/45",
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </div>

                  <div className="min-w-0 sm:text-center">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isCurrent
                          ? "text-foreground"
                          : isCompleted
                            ? "text-foreground/85"
                            : "text-muted-foreground/55",
                      )}
                    >
                      {rank.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/65">
                      {rank.min}
                      {index === ranks.length - 1 ? "+" : ` - ${rank.max}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-[24px] border border-border/40 bg-background/35 px-4 py-3">
          {nextRank ? (
            <p className="text-sm text-muted-foreground">
              距离{" "}
              <span className="font-semibold text-foreground">
                {nextRank.name}
              </span>{" "}
              还差{" "}
              <span className="font-semibold text-brand">
                {overview.nextRankRemainingXP} XP
              </span>
              ，继续完成当前关卡会是最快的推进方式。
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              当前已到达最高段位，后续成长将继续沉淀为更多
              XP、徽章和连续学习记录。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
