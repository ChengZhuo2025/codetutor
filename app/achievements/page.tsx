"use client"

import Link from "next/link"
import {
  Code2,
  BookOpen,
  Map,
  Trophy,
  Flame,
  Zap,
  Star,
  CheckCircle2,
  Target,
  Award,
  Calendar,
  TrendingUp,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SettingsPopover } from "@/components/ui/settings-popover"

const ranks = [
  { name: "萌新码农", min: 0, max: 200, color: "text-muted-foreground", bg: "bg-surface-4" },
  { name: "AI 学徒", min: 200, max: 500, color: "text-chart-5", bg: "bg-chart-5/20" },
  { name: "Vibe Coder", min: 500, max: 1000, color: "text-brand", bg: "bg-brand-dim" },
  { name: "AI 建造者", min: 1000, max: 2000, color: "text-chart-3", bg: "bg-chart-3/10" },
  { name: "AI 编程大师", min: 2000, max: 9999, color: "text-gold", bg: "bg-gold-dim" },
]

const currentXP = 680
const currentRankIdx = 2

const badges = [
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

// checkinDays[week][weekday]: true=打卡, false=未打卡
// 本月从周一开始，第4行（wi=3）之后均为未来日期
const checkinDays = [
  [true, true, true, false, true, true, true],
  [true, false, true, true, true, true, false],
  [true, true, false, true, true, false, false],
  [false, false, false, false, false, false, false],
]
// 对应日期（从本月 1 日开始）
const calendarDates = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
]

const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

const stats = [
  { label: "累计学分", value: "680", unit: "XP", icon: Zap, color: "text-brand" },
  { label: "连续打卡", value: "7", unit: "天", icon: Flame, color: "text-gold" },
  { label: "完成任务", value: "14", unit: "关", icon: CheckCircle2, color: "text-chart-3" },
  { label: "学习天数", value: "21", unit: "天", icon: Calendar, color: "text-chart-5" },
]

export default function AchievementsPage() {
  const currentRank = ranks[currentRankIdx]
  const nextRank = ranks[currentRankIdx + 1]
  const progress =
    ((currentXP - currentRank.min) / (currentRank.max - currentRank.min)) * 100

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border/50 bg-sidebar">
        <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="font-semibold">CodeTutor</span>
        </div>
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {[
            { icon: BookOpen, label: "学习", href: "/learn" },
            { icon: Map, label: "闯关地图", href: "/map" },
            { icon: Trophy, label: "成就", href: "/achievements", active: true },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-brand-dim text-brand"
                    : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border/50 p-4">
          <SettingsPopover />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border/50 bg-surface-1/80 px-8 py-5 backdrop-blur-sm">
          <h1 className="text-xl font-bold tracking-tight">个人成就</h1>
          <p className="text-sm text-muted-foreground">你的学习轨迹与成长记录</p>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left — main content ~70% */}
          <div className="flex-1 overflow-y-auto space-y-6 px-8 py-8 min-w-0">
          {/* Rank card */}
          <div className="overflow-hidden rounded-2xl border border-brand/20 bg-brand-dim">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                {/* Current rank */}
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    当前段位
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-brand/40 bg-brand/10 text-2xl">
                      {"</"}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-brand">{currentRank.name}</h2>
                      <p className="text-sm text-muted-foreground">{currentXP} XP</p>
                    </div>
                  </div>
                </div>

                {/* Next rank */}
                <div className="text-right">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    下一段位
                  </p>
                  <p className="font-semibold text-chart-3">{nextRank.name}</p>
                  <p className="text-sm text-muted-foreground">
                    还需 <span className="font-bold text-foreground">{nextRank.min - currentXP}</span> XP
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{currentRank.name} ({currentRank.min})</span>
                  <span>{nextRank.name} ({nextRank.min})</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-surface-4">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs font-medium text-brand">
                  {Math.round(progress)}% 完成
                </p>
              </div>
            </div>

            {/* Rank ladder */}
            <div className="border-t border-border/30 px-6 py-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {ranks.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                        i === currentRankIdx
                          ? "border-brand bg-brand text-brand-foreground"
                          : i < currentRankIdx
                          ? "border-brand/30 text-muted-foreground"
                          : "border-border/30 text-muted-foreground/40"
                      )}
                    >
                      {i < currentRankIdx && <CheckCircle2 className="h-3 w-3" />}
                      {r.name}
                    </div>
                    {i < ranks.length - 1 && (
                      <div className="h-px w-4 shrink-0 bg-border/40" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-surface-2 py-6 text-center"
                >
                  <Icon className={cn("mb-2 h-6 w-6", s.color)} />
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{s.value}</span>
                    <span className="text-sm text-muted-foreground">{s.unit}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              )
            })}
          </div>

          {/* Check-in calendar */}
          <div className="rounded-2xl border border-border/60 bg-surface-2 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">打卡记录</h3>
              <div className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold-dim px-3 py-1.5">
                <Flame className="h-4 w-4 text-gold" />
                <span className="text-sm font-bold text-gold">7 天连续</span>
              </div>
            </div>

            {/* Calendar */}
            <div className="space-y-2">
              {/* Week header */}
              <div className="grid grid-cols-7 gap-1.5 px-0.5">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground/60">
                    {d}
                  </div>
                ))}
              </div>
              {/* Weeks */}
              {checkinDays.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1.5">
                  {week.map((checked, di) => {
                    const isFuture = wi === 3 && di > 0
                    return (
                      <div
                        key={di}
                        className={cn(
                          "relative flex aspect-square items-end justify-start rounded-lg p-1.5 transition-colors",
                          checked
                            ? "bg-brand/25 shadow-[0_0_6px_oklch(0.78_0.15_180/0.25)]"
                            : isFuture
                            ? "bg-surface-3/20"
                            : "bg-surface-3"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[11px] font-medium leading-none",
                            checked
                              ? "text-brand"
                              : isFuture
                              ? "text-muted-foreground/30"
                              : "text-muted-foreground/50"
                          )}
                        >
                          {calendarDates[wi][di]}
                        </span>
                        {checked && (
                          <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              本月已打卡 <span className="font-semibold text-foreground">18</span> 天，获得{" "}
              <span className="font-semibold text-brand">360 XP</span>
            </p>
          </div>

          {/* Badges */}
          <div className="rounded-2xl border border-border/60 bg-surface-2 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">成就徽章</h3>
              <span className="text-sm text-muted-foreground">
                2 / {badges.length} 已获得
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => {
                const Icon = badge.icon
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4",
                      badge.color,
                      !badge.earned && "opacity-50"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-current/5">
                      {badge.earned ? (
                        <Icon className="h-5 w-5" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{badge.title}</p>
                      <p className="text-xs leading-relaxed opacity-70 mt-0.5">{badge.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>{/* end badges */}
          </div>{/* end left col */}

          {/* Right — sidebar ~30% */}
          <div className="w-80 shrink-0 overflow-y-auto border-l border-border/50 px-5 py-8 space-y-5">

            {/* 进阶攻略 */}
            <div className="rounded-2xl border border-border/60 bg-surface-2 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-brand" />
                进阶攻略
              </h3>
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                学分（XP）是你在 CodeTutor 的成长积累，以下方式均可获得：
              </p>
              <ul className="space-y-3">
                {[
                  { label: "完成关卡任务", xp: "+10 XP", color: "text-brand", desc: "每完成一个标准关卡" },
                  { label: "Boss 关", xp: "+20 XP", color: "text-gold", desc: "完成综合实战关卡" },
                  { label: "每日打卡", xp: "+5 XP", color: "text-chart-3", desc: "连续天数有额外加成" },
                  { label: "连续 7 天", xp: "+30 XP", color: "text-gold", desc: "七日连续打卡额外奖励" },
                  { label: "获得徽章", xp: "+50 XP", color: "text-chart-5", desc: "解锁成就徽章时发放" },
                  { label: "分享学习", xp: "+15 XP", color: "text-muted-foreground", desc: "分享进度到社区" },
                ].map((item) => (
                  <li key={item.label} className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground/70">{item.desc}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-xs font-bold ${item.color}`}>
                      {item.xp}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* XP 获取历史 */}
            <div className="rounded-2xl border border-border/60 bg-surface-2 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Zap className="h-4 w-4 text-gold" />
                XP 获取记录
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "完成「Chat vs Composer」",  xp: "+10", time: "今天 14:32", type: "task" },
                  { label: "每日打卡",                   xp: "+5",  time: "今天 09:00", type: "checkin" },
                  { label: "完成「第一次 AI 对话」",     xp: "+10", time: "昨天 20:15", type: "task" },
                  { label: "每日打卡",                   xp: "+5",  time: "昨天 09:00", type: "checkin" },
                  { label: "七日连续打卡",               xp: "+30", time: "3天前",      type: "bonus" },
                  { label: "获得「七日连击」徽章",        xp: "+50", time: "3天前",      type: "badge" },
                  { label: "完成「安装与配置」",          xp: "+10", time: "5天前",      type: "task" },
                  { label: "每日打卡",                   xp: "+5",  time: "7天前",      type: "checkin" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">{item.label}</p>
                      <p className="text-muted-foreground/70">{item.time}</p>
                    </div>
                    <span className={`shrink-0 font-bold ${
                      item.type === "bonus" || item.type === "badge"
                        ? "text-gold"
                        : item.type === "checkin"
                        ? "text-chart-3"
                        : "text-brand"
                    }`}>
                      {item.xp}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-border/40 pt-3 text-right text-xs text-muted-foreground">
                累计 <span className="font-bold text-foreground">680</span> XP
              </p>
            </div>

          </div>{/* end right col */}
        </div>{/* end body flex */}
      </main>
    </div>
  )
}
