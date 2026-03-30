import {
  Calendar,
  CheckCircle2,
  Flame,
  Zap,
} from "lucide-react"
import {
  BuildBadgeIcon,
  CodeRankIcon,
  CrownRankIcon,
  FlameBadgeIcon,
  ForgeRankIcon,
  MultiToolBadgeIcon,
  OrbitRankIcon,
  SeedRankIcon,
  SparkBadgeIcon,
  TargetBadgeIcon,
  TrophyBadgeIcon,
} from "@/features/achievement/components/solid-achievement-icons"
import {
  getNextRankDefinition,
  getRankName,
  RANK_DEFINITIONS,
} from "@/constants/ranks"
import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  AchievementSummaryResponseData,
  AchievementBadgeCode,
  AchievementBadgeContract,
  AchievementRankCode,
  AchievementRankContract,
} from "@/lib/api/contracts/achievement"
import type {
  Badge,
  Rank,
  StatItem,
  XpGuideItem,
} from "@/features/achievement/types"

const ACHIEVEMENT_RANK_PRESENTATION: Record<
  AchievementRankCode,
  Pick<Rank, "icon" | "color" | "bg">
> = {
  rookie: {
    icon: SeedRankIcon,
    color: "text-muted-foreground",
    bg: "bg-surface-4",
  },
  apprentice: {
    icon: OrbitRankIcon,
    color: "text-chart-5",
    bg: "bg-chart-5/20",
  },
  vibe_coder: {
    icon: CodeRankIcon,
    color: "text-brand",
    bg: "bg-brand-dim",
  },
  builder: {
    icon: ForgeRankIcon,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  master: {
    icon: CrownRankIcon,
    color: "text-gold",
    bg: "bg-gold-dim",
  },
}

const ACHIEVEMENT_BADGE_PRESENTATION: Record<AchievementBadgeCode, Badge["icon"]> = {
  first_task: SparkBadgeIcon,
  seven_day_streak: FlameBadgeIcon,
  first_debug: TargetBadgeIcon,
  first_project: BuildBadgeIcon,
  multi_tool_master: MultiToolBadgeIcon,
  monthly_champion: TrophyBadgeIcon,
}

const ACHIEVEMENT_RANKS: AchievementRankContract[] = RANK_DEFINITIONS.map((rank) => ({
  code: rank.code,
  name: rank.name,
  minScore: rank.minScore,
  maxScore: rank.maxScore,
}))

const ACHIEVEMENT_GUIDE_ITEMS: XpGuideItem[] = [
  { label: "完成关卡任务", xp: "+10", color: "text-brand", desc: "每完成一个标准关卡" },
  { label: "Boss 关", xp: "+20", color: "text-gold", desc: "完成综合实战关卡" },
  { label: "每日打卡", xp: "+5", color: "text-chart-3", desc: "连续天数有额外加成" },
  { label: "连续 7 天", xp: "+30", color: "text-gold", desc: "七日连续打卡额外奖励" },
  { label: "获得徽章", xp: "+50", color: "text-chart-5", desc: "解锁成就徽章时发放" },
  { label: "分享学习", xp: "+15", color: "text-muted-foreground", desc: "分享进度到社区" },
]

export function getAchievementRankContracts() {
  return ACHIEVEMENT_RANKS
}

export function buildAchievementGuideItems() {
  return ACHIEVEMENT_GUIDE_ITEMS
}

export function buildAchievementStats(summary: AchievementSummaryResponseData): StatItem[] {
  return [
    {
      label: "累计 XP",
      value: String(summary.overview.totalXP),
      unit: "XP",
      icon: Zap,
      color: "text-brand",
      hint: "每完成一个关卡都会继续累积",
    },
    {
      label: "连续学习",
      value: String(summary.overview.streakDays),
      unit: "天",
      icon: Flame,
      color: "text-gold",
      hint: "保持节奏比一次学很久更重要",
    },
    {
      label: "完成关卡",
      value: String(summary.completedTaskCount),
      unit: "关",
      icon: CheckCircle2,
      color: "text-chart-3",
      hint: "从安装到调试都算成长里程碑",
    },
    {
      label: "累计学习",
      value: String(summary.overview.totalCheckinDays),
      unit: "天",
      icon: Calendar,
      color: "text-chart-5",
      hint: "你已经形成了可持续的学习习惯",
    },
  ]
}

export function toAchievementRanks(ranks: AchievementRankContract[]): Rank[] {
  return ranks.map((rank) => ({
    name: rank.name,
    min: rank.minScore,
    max: rank.maxScore,
    ...ACHIEVEMENT_RANK_PRESENTATION[rank.code],
  }))
}

export function toAchievementBadges(badges: AchievementBadgeContract[]): Badge[] {
  return badges.map((badge, index) => ({
    id: index + 1,
    title: badge.title,
    desc: badge.desc,
    icon: ACHIEVEMENT_BADGE_PRESENTATION[badge.code],
    earned: badge.earned,
    progressHint: badge.progressHint,
    color: badge.earned
      ? "text-brand border-brand/30 bg-brand-dim"
      : "text-muted-foreground border-border/40 bg-surface-3",
  }))
}

export const mockAchievementSummaryResponse: ApiSuccessResponse<AchievementSummaryResponseData> = {
  code: "OK",
  message: "success",
  data: {
    currentRankCode: "vibe_coder",
    currentRank: getRankName("vibe_coder"),
    currentScore: 680,
    nextRank: getNextRankDefinition("vibe_coder").name,
    nextRankRemainingXP: 320,
    completedTaskCount: 14,
    streakDays: 7,
    overview: {
      totalXP: 680,
      streakDays: 7,
      monthlyXP: 360,
      totalCheckinDays: 21,
      nextRankRemainingXP: 320,
      earnedBadges: 2,
    },
    ranks: ACHIEVEMENT_RANKS,
    badges: [
      {
        code: "first_task",
        title: "零到一",
        desc: "完成第一个自由模式的AI编程任务",
        earned: true,
        progressHint: "已完成第一个任务切入点",
      },
      {
        code: "seven_day_streak",
        title: "七日连击",
        desc: "连续学习7天",
        earned: true,
        progressHint: "当前连续学习仍在继续",
      },
      {
        code: "first_debug",
        title: "代码驯服师",
        desc: "完成第一次AI调试",
        earned: false,
        progressHint: "完成「AI 调试助手」后解锁",
      },
      {
        code: "first_project",
        title: "构建者",
        desc: "与Ai协作完成第一个完整项目",
        earned: false,
        progressHint: "完成完整项目实战后解锁",
      },
      {
        code: "multi_tool_master",
        title: "多面手",
        desc: "掌握 3 个以上 AI 编程工具",
        earned: false,
        progressHint: "再完成 2 条工具路径",
      },
      {
        code: "monthly_champion",
        title: "月度冠军",
        desc: "单月学分排名TOP榜前三",
        earned: false,
        progressHint: "保持每周稳定学习更容易触发",
      },
    ],
    history: [
      { label: "完成「Chat vs Composer」", xp: 10, time: "今天 14:32", type: "task" },
      { label: "每日打卡", xp: 5, time: "今天 09:00", type: "checkin" },
      { label: "完成「第一次 AI 对话」", xp: 10, time: "昨天 20:15", type: "task" },
      { label: "每日打卡", xp: 5, time: "昨天 09:00", type: "checkin" },
      { label: "七日连续打卡", xp: 30, time: "3 天前", type: "bonus" },
      { label: "获得「七日连击」徽章", xp: 50, time: "3 天前", type: "badge" },
      { label: "完成「安装与配置」", xp: 10, time: "5 天前", type: "task" },
      { label: "每日打卡", xp: 5, time: "7 天前", type: "checkin" },
    ],
    calendar: {
      weekDays: ["一", "二", "三", "四", "五", "六", "日"],
      dates: [
        [1, 2, 3, 4, 5, 6, 7],
        [8, 9, 10, 11, 12, 13, 14],
        [15, 16, 17, 18, 19, 20, 21],
        [22, 23, 24, 25, 26, 27, 28],
      ],
      checkins: [
        [true, true, true, false, true, true, true],
        [true, false, true, true, true, true, false],
        [true, true, false, true, true, false, false],
        [false, false, false, false, false, false, false],
      ],
    },
  },
}
