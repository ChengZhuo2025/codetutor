import { Icon } from "@iconify/react/offline";
import { Check, Sparkles } from "lucide-react";
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
  USER_PANEL_HERO_CARD_CLASS,
  USER_PANEL_HERO_TOP_SECTION_CLASS,
} from "@/components/ui/surface-styles";
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
  const CurrentRankIcon = currentRank.icon;
  const currentRange = Math.max(currentRank.max - currentRank.min, 1);
  const progress = Math.min(
    100,
    Math.max(0, ((currentXP - currentRank.min) / currentRange) * 100),
  );

  return (
    <div className={cn("overflow-hidden rounded-[34px]", USER_PANEL_HERO_CARD_CLASS)}>
      <div className={cn(USER_PANEL_HERO_TOP_SECTION_CLASS, "px-5 py-6 sm:px-6")}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-brand/80">
          <Sparkles className="h-3.5 w-3.5" />
          当前段位
        </div>

        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] border border-brand/30 bg-brand/10 text-brand dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center">
              <Icon icon={CurrentRankIcon} width={40} height={40} className="block" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-3xl font-bold tracking-tight text-brand">
              {currentRank.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              已累计 {overview.totalXP} XP，连续学习 {overview.streakDays}{" "}
              天。完成当前关卡即可获得 XP，积累足够后自动晋升下一段位。
            </p>
          </div>
          <div className="flex flex-col gap-3 xl:w-[180px] xl:justify-self-end">
            <button
              onClick={onContinueLearning}
              className={cn(
                "flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold",
                USER_BUTTON_PRIMARY_CLASS,
              )}
            >
              继续学习赚XP
            </button>
            <button
              onClick={onOpenMap}
              className={cn(
                "flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium",
                USER_BUTTON_SECONDARY_CLASS,
              )}
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
              段位提升进程
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              实线为已达成段位，虚线为未解锁段位。
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
                          : "border-dashed border-border/80 dark:border-white/20",
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
                          : "border-border/70 bg-surface-3 text-muted-foreground/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
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

        <div className="mt-5 rounded-[24px] border border-border/70 bg-surface-2 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
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
              ，继续完成当前关卡即可积累。
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
