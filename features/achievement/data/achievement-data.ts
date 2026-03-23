import {
  Award,
  Calendar,
  CheckCircle2,
  Flame,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"
import type {
  Badge,
  Rank,
  StatItem,
  XpGuideItem,
  XpHistoryItem,
} from "@/features/achievement/types"

export const ranks: Rank[] = [
  { name: "萌新码农", min: 0, max: 200, color: "text-muted-foreground", bg: "bg-surface-4" },
  { name: "AI 学徒", min: 200, max: 500, color: "text-chart-5", bg: "bg-chart-5/20" },
  { name: "Vibe Coder", min: 500, max: 1000, color: "text-brand", bg: "bg-brand-dim" },
  { name: "AI 建造者", min: 1000, max: 2000, color: "text-chart-3", bg: "bg-chart-3/10" },
  { name: "AI 编程大师", min: 2000, max: 9999, color: "text-gold", bg: "bg-gold-dim" },
]

export const currentXP = 680
export const currentRankIdx = 2

export const badges: Badge[] = [
  {
    id: 1,
    title: "零到一",
    desc: "完成人生第一个 AI 编程任务",
    icon: Star,
    earned: true,
    color: "text-gold border-gold/30 bg-gold-dim",
  },
  {
    id: 2,
    title: "七日连击",
    desc: "连续学习 7 天",
    icon: Flame,
    earned: true,
    color: "text-chart-4 border-chart-4/30 bg-chart-4/10",
  },
  {
    id: 3,
    title: "代码驯服师",
    desc: "完成第一次 AI 调试",
    icon: Target,
    earned: false,
    color: "text-muted-foreground border-border/40 bg-surface-3",
  },
  {
    id: 4,
    title: "构建者",
    desc: "完成第一个完整项目",
    icon: Award,
    earned: false,
    color: "text-muted-foreground border-border/40 bg-surface-3",
  },
  {
    id: 5,
    title: "多面手",
    desc: "掌握 3 个以上 AI 编程工具",
    icon: TrendingUp,
    earned: false,
    color: "text-muted-foreground border-border/40 bg-surface-3",
  },
  {
    id: 6,
    title: "月度冠军",
    desc: "单月学分排名前 10%",
    icon: Trophy,
    earned: false,
    color: "text-muted-foreground border-border/40 bg-surface-3",
  },
]

export const checkinDays = [
  [true, true, true, false, true, true, true],
  [true, false, true, true, true, true, false],
  [true, true, false, true, true, false, false],
  [false, false, false, false, false, false, false],
]

export const calendarDates = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
]

export const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

export const stats: StatItem[] = [
  { label: "累计学分", value: "680", unit: "XP", icon: Zap, color: "text-brand" },
  { label: "连续打卡", value: "7", unit: "天", icon: Flame, color: "text-gold" },
  { label: "完成任务", value: "14", unit: "关", icon: CheckCircle2, color: "text-chart-3" },
  { label: "学习天数", value: "21", unit: "天", icon: Calendar, color: "text-chart-5" },
]

export const xpGuideItems: XpGuideItem[] = [
  { label: "完成关卡任务", xp: "+10 XP", color: "text-brand", desc: "每完成一个标准关卡" },
  { label: "Boss 关", xp: "+20 XP", color: "text-gold", desc: "完成综合实战关卡" },
  { label: "每日打卡", xp: "+5 XP", color: "text-chart-3", desc: "连续天数有额外加成" },
  { label: "连续 7 天", xp: "+30 XP", color: "text-gold", desc: "七日连续打卡额外奖励" },
  { label: "获得徽章", xp: "+50 XP", color: "text-chart-5", desc: "解锁成就徽章时发放" },
  { label: "分享学习", xp: "+15 XP", color: "text-muted-foreground", desc: "分享进度到社区" },
]

export const xpHistory: XpHistoryItem[] = [
  { label: "完成「Chat vs Composer」", xp: "+10", time: "今天 14:32", type: "task" },
  { label: "每日打卡", xp: "+5", time: "今天 09:00", type: "checkin" },
  { label: "完成「第一次 AI 对话」", xp: "+10", time: "昨天 20:15", type: "task" },
  { label: "每日打卡", xp: "+5", time: "昨天 09:00", type: "checkin" },
  { label: "七日连续打卡", xp: "+30", time: "3天前", type: "bonus" },
  { label: "获得「七日连击」徽章", xp: "+50", time: "3天前", type: "badge" },
  { label: "完成「安装与配置」", xp: "+10", time: "5天前", type: "task" },
  { label: "每日打卡", xp: "+5", time: "7天前", type: "checkin" },
]
