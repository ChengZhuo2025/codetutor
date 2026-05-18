"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Code2,
  Crown,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Trash2,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getRankTierProgressForScore } from "@/constants/ranks";
import { useAppToast } from "@/components/app-feedback/app-toast-provider";
import { NotificationDetailDialog } from "@/components/layout/notification-detail-dialog";
import { ProfileEditDialog } from "@/components/layout/profile-edit-dialog";
import { SubscriptionDetailDialog } from "@/components/layout/subscription-detail-dialog";
import { SettingsPopover } from "@/components/layout/settings-popover";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePublicSite } from "@/features/site/providers/public-site-provider";
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth";
import type { NotificationInAppItem } from "@/lib/api/contracts/notifications";
import type { LearningHistory } from "@/features/history/types";
import { getInAppNotificationListTitle } from "@/lib/notifications/in-app-display";
import { useWorkspaceSidebarData } from "@/providers/workspace-sidebar-provider";
import { cn } from "@/lib/utils";
import type { DashboardNavItem } from "@/types/navigation";
import type { SubscriptionSnapshot } from "@/types/profile";

type DashboardSidebarProps = {
  items: DashboardNavItem[];
  widthClass?: string;
  showSettings?: boolean;
  className?: string;
  children?: React.ReactNode;
  footerContent?: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

type NotificationPanelState = {
  expanded: boolean;
  selectedNotification: NotificationInAppItem | null;
  dialogOpen: boolean;
};

type SidebarRailActionProps = {
  label: string;
  active?: boolean;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
};

const SUBSCRIPTION_PLACEHOLDER: SubscriptionSnapshot = {
  planName: "免费版",
  planPriceLabel: "¥0.00",
  billingCycleLabel: "限时体验",
  expiresAt: "加载中",
  remainingDays: 0,
  quotaLabel: "免费体验期内可使用基础学习能力",
  renewalHint: "正在读取订阅有效期。",
  primaryActionLabel: "升级套餐",
  secondaryActionLabel: "立即续费",
};

function SidebarRailAction({
  label,
  active = false,
  badge,
  href,
  onClick,
  children,
}: SidebarRailActionProps) {
  const sharedClassName = cn(
    "relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
    active
      ? "border-brand/20 bg-brand-dim text-brand shadow-[0_12px_30px_-18px_rgba(8,145,178,0.42)]"
      : "border-border/60 bg-surface-2/80 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
  );

  const content = href ? (
    <Link href={href} aria-label={label} title={label} className={sharedClassName}>
      {children}
      {badge}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={sharedClassName}
    >
      {children}
      {badge}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function getRecentLearningPlanHref(status: LearningHistory["status"]) {
  switch (status) {
    case "in_progress":
      return ROUTES.learn;
    default:
      return ROUTES.history;
  }
}

function formatSubscriptionExpiresAt(
  expiresAt: string | null | undefined,
  planCode?: string | null,
  plans?: Array<{ code: string; durationDays: number }>,
  startsAt?: string | null,
) {
  const resolvedExpiresAt =
    expiresAt ??
    (planCode === "free" && startsAt
      ? (() => {
          const freePlan = plans?.find((plan) => plan.code === "free");
          if (!freePlan) return null;
          const startDate = new Date(startsAt);
          if (Number.isNaN(startDate.getTime())) return null;
          return new Date(
            startDate.getTime() + freePlan.durationDays * 86_400_000,
          ).toISOString();
        })()
      : null);

  if (!resolvedExpiresAt) return "读取中";
  const date = new Date(resolvedExpiresAt);
  if (Number.isNaN(date.getTime())) return "读取中";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function DashboardSidebar({
  items,
  widthClass = "w-64",
  showSettings = true,
  className,
  children,
  footerContent,
  collapsed = false,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  const { site } = usePublicSite();
  const siteName = site.information.siteName;
  const logoUrl = site.information.logoUrl;
  const toast = useAppToast();
  const {
    profile,
    subscription: subscriptionData,
    recentLearningPlans,
    notifications,
    unreadNotificationCount,
    hasLoaded,
    updateProfile,
    markNotificationRead,
    dismissNotification,
  } = useWorkspaceSidebarData();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileFeedbackMessage, setProfileFeedbackMessage] = useState<
    string | null
  >(null);

  const [notifPanel, setNotifPanel] = useState<NotificationPanelState>({
    expanded: false,
    selectedNotification: null,
    dialogOpen: false,
  });

  const handleProfileSaved = (nextProfile: ProfileMeResponseData) => {
    updateProfile(nextProfile);
    setProfileFeedbackMessage("个人资料已保存");
  };

  useEffect(() => {
    if (!profileFeedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProfileFeedbackMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [profileFeedbackMessage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    for (const item of notifications) {
      if (item.status !== "unread") {
        continue;
      }

      const sessionKey = `workspace-notification-toast:${item.id}`;
      if (window.sessionStorage.getItem(sessionKey) === "1") {
        continue;
      }

      toast.info(getInAppNotificationListTitle(item), item.content);
      window.sessionStorage.setItem(sessionKey, "1");
    }
  }, [notifications, toast]);

  const removeReadNotification = async (
    event: MouseEvent,
    notificationId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await dismissNotification(notificationId);
      toast.success("已移除");
    } catch {
      toast.error("删除失败，请重试");
    }
  };

  const displayProfile = hasLoaded ? profile : null;

  const fallbackProfile = {
    userId: "loading",
    nickname: "加载中",
    avatarUrl: null,
    phone: null,
    email: null,
    wechat: null,
    bio: null,
    primaryTool: {
      code: "unselected",
      name: "未选择",
    },
    learningLevel: "beginner",
    currentScore: 0,
    currentRank: "待同步",
    streakDays: 0,
    completedTaskCount: 0,
    lastLearningAt: new Date(0).toISOString(),
    createdAt: null,
  };

  const resolvedProfile = displayProfile ?? fallbackProfile;
  const subscription = {
    ...SUBSCRIPTION_PLACEHOLDER,
    planName: subscriptionData?.current.planName ?? SUBSCRIPTION_PLACEHOLDER.planName,
    expiresAt: formatSubscriptionExpiresAt(
      subscriptionData?.current.expiresAt,
      subscriptionData?.current.planCode,
      subscriptionData?.plans,
      subscriptionData?.current.startsAt ?? resolvedProfile.createdAt,
    ),
    remainingDays: subscriptionData?.current.remainingDays ?? SUBSCRIPTION_PLACEHOLDER.remainingDays,
    renewalHint: subscriptionData?.current.expiresAt
      ? `当前套餐剩余 ${subscriptionData.current.remainingDays} 天。`
      : SUBSCRIPTION_PLACEHOLDER.renewalHint,
  };
  const rankTierProgress = getRankTierProgressForScore(resolvedProfile.currentScore);
  const progressPercent = rankTierProgress.percent;
  const visibleRecentPlans = recentLearningPlans.slice(0, 3);
  const latestNotification = notifications[0] ?? null;

  const historyStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress":
        return "进行中";
      case "completed":
        return "已完成";
      case "interrupted":
        return "已中断";
      case "abandoned":
        return "已放弃";
      default:
        return "未知";
    }
  };

  const formatPlanCreatedAt = (createdAt: string) => {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "创建时间未知";
    }

    return `创建于 ${new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date)}`;
  };

  const handleOpenLatestNotification = () => {
    if (!latestNotification) {
      toast.info("暂无学习提醒", "完成打卡或任务后，新的提醒会出现在这里。");
      return;
    }

    setNotifPanel((current) => ({
      ...current,
      expanded: true,
      selectedNotification: latestNotification,
      dialogOpen: true,
    }));
  };

  const dialogs = (
    <>
      <ProfileEditDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSaved={handleProfileSaved}
      />

      <NotificationDetailDialog
        open={notifPanel.dialogOpen}
        onOpenChange={(open) =>
          setNotifPanel((current) => ({ ...current, dialogOpen: open }))
        }
        notification={notifPanel.selectedNotification}
        onMarkRead={markNotificationRead}
      />
    </>
  );

  if (collapsed) {
    return (
      <>
        <aside
          className={cn(
            "flex h-full min-h-0 shrink-0 flex-col items-center border-r border-border/50 bg-sidebar px-3 py-4",
            widthClass,
            className,
          )}
        >
          <SidebarRailAction label={siteName} href={ROUTES.learn}>
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-brand text-brand-foreground">
              {logoUrl ? (
                <Image src={logoUrl} alt={`${siteName} logo`} width={32} height={32} className="h-full w-full object-contain" unoptimized />
              ) : (
                <Code2 className="h-4 w-4" />
              )}
            </div>
          </SidebarRailAction>

          {showSettings ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-3">
                  <ThemeToggle className="h-11 w-11 rounded-2xl text-muted-foreground hover:text-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                切换主题
              </TooltipContent>
            </Tooltip>
          ) : null}

          <div className="mt-5 flex flex-col items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  aria-label="打开个人资料"
                  title="个人资料"
                  className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-brand/20 bg-brand-dim text-sm font-bold text-brand shadow-[0_14px_34px_-24px_rgba(8,145,178,0.35)] transition-opacity hover:opacity-85"
                >
                  {resolvedProfile.avatarUrl ? (
                    <Image
                      src={resolvedProfile.avatarUrl}
                      alt={resolvedProfile.nickname}
                      width={44}
                      height={44}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    resolvedProfile.nickname.slice(0, 1)
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {resolvedProfile.nickname}
              </TooltipContent>
            </Tooltip>
          </div>

          <nav className="mt-5 flex flex-col gap-2">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <SidebarRailAction
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  active={item.active}
                >
                  <Icon className="h-4 w-4" />
                </SidebarRailAction>
              );
            })}
          </nav>

          <div className="mt-5">
            <SidebarRailAction
              label={
                unreadNotificationCount > 0
                  ? `学习提醒（${unreadNotificationCount} 条未读）`
                  : "学习提醒"
              }
              onClick={handleOpenLatestNotification}
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 ? (
                <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(8,145,178,0.6)]">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              ) : null}
            </SidebarRailAction>
          </div>

          <div className="mt-auto flex flex-col items-center gap-2">
            {showSettings ? (
              <SettingsPopover
                iconOnly
                className="h-11 w-11"
                onProfileSaved={handleProfileSaved}
              />
            ) : null}

            {onToggleCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onToggleCollapsed}
                    aria-label="展开侧栏"
                    title="展开侧栏"
                    className="h-11 w-11 rounded-2xl text-muted-foreground hover:text-foreground"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  展开侧栏
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </aside>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <aside
        className={cn(
          "flex h-full min-h-0 shrink-0 flex-col border-r border-border/50 bg-sidebar transition-[width] duration-300",
          widthClass,
          className,
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 border-b border-border/50 px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-brand text-brand-foreground">
              {logoUrl ? (
                <Image src={logoUrl} alt={`${siteName} logo`} width={32} height={32} className="h-full w-full object-contain" unoptimized />
              ) : (
                <Code2 className="h-4 w-4" />
              )}
            </div>
            <span className="truncate font-semibold">{siteName}</span>
          </div>

          {showSettings ? (
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
          <div className="space-y-4 px-4 py-4">
            <div className="rounded-[24px] border border-border/50 bg-surface-3 p-4">
              <div className="mb-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dim text-md font-bold text-brand transition-opacity hover:opacity-80"
                >
                  {resolvedProfile.avatarUrl ? (
                    <Image
                      src={resolvedProfile.avatarUrl}
                      alt={resolvedProfile.nickname}
                      width={44}
                      height={44}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    resolvedProfile.nickname.slice(0, 1)
                  )}
                </button>
                <SubscriptionDetailDialog subscription={subscription}>
                  <div className="min-w-0 flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-md font-semibold text-foreground">
                        {resolvedProfile.nickname}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold-dim px-1.5 py-0.5 text-[10px] font-medium text-gold">
                        <Crown className="h-2.5 w-2.5" />
                        {subscription.planName}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      有效期至 {subscription.expiresAt}
                    </p>
                  </div>
                </SubscriptionDetailDialog>
              </div>

              <Link
                href={ROUTES.achievements}
                className="block rounded-xl transition-colors -mx-1 px-1 py-1"
              >
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {rankTierProgress.xpInCurrentTier} / {rankTierProgress.tierSpanXp}{" "}
                    XP
                  </span>
                  <span className="text-muted-foreground">{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/6 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5">
                    <Flame className="h-4 w-4 text-gold" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        连续学习
                      </p>
                      <p className="text-sm font-semibold text-gold">
                        {resolvedProfile.streakDays} 天
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5">
                    <Star className="h-4 w-4 text-brand" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">已完成</p>
                      <p className="text-sm font-semibold">
                        {resolvedProfile.completedTaskCount} 关
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              {profileFeedbackMessage ? (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                  {profileFeedbackMessage}
                </div>
              ) : null}
            </div>

            <nav className="space-y-1 rounded-[24px] border border-border/60 bg-surface-2/80 p-2">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                      item.active
                        ? "bg-brand-dim text-brand ring-1 ring-brand/15"
                        : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-surface-2/80">
              <button
                type="button"
                onClick={() =>
                  setNotifPanel((current) => ({
                    ...current,
                    expanded: !current.expanded,
                  }))
                }
                className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-surface-3/85"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <p className="text-sm font-semibold text-foreground">
                      学习提醒
                    </p>
                    <p
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px]",
                        unreadNotificationCount > 0
                          ? "border-brand/45 bg-brand/12 font-medium text-brand shadow-sm shadow-brand/20"
                          : "border-border/80 bg-background/60 text-muted-foreground",
                      )}
                    >
                      {unreadNotificationCount > 0
                        ? `${unreadNotificationCount} 条未读`
                        : "全部已读"}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4.5 w-4.5 text-muted-foreground transition-transform duration-200",
                    notifPanel.expanded && "rotate-180",
                  )}
                />
              </button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  notifPanel.expanded
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0",
                )}
              >
                <div className="border-t border-border/80">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-border/30">
                      {notifications.map((item) => {
                        const isUnread = item.status === "unread";
                        return (
                          <div
                            key={item.id}
                            className="flex w-full items-center gap-2 px-4 py-2.5 transition-colors hover:bg-surface-3"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setNotifPanel((current) => ({
                                  ...current,
                                  selectedNotification: item,
                                  dialogOpen: true,
                                }))
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left active:opacity-90"
                            >
                              <div
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  isUnread
                                    ? "bg-brand"
                                    : "bg-muted-foreground/30",
                                )}
                              />
                              <span
                                className={cn(
                                  "truncate text-sm",
                                  isUnread
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {getInAppNotificationListTitle(item)}
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px]",
                                  isUnread
                                    ? "border-brand/30 bg-brand/10 text-brand"
                                    : "border-border/80 bg-background/40 text-muted-foreground",
                                )}
                              >
                                {isUnread ? "未读" : "已读"}
                              </span>
                              {!isUnread ? (
                                <button
                                  type="button"
                                  aria-label="删除提醒"
                                  onClick={(event) =>
                                    void removeReadNotification(event, item.id)
                                  }
                                  className={cn(
                                    "rounded-full p-1.5 text-rose-600 transition-colors",
                                    "hover:bg-rose-500/12 hover:text-rose-700",
                                    "dark:text-rose-400 dark:hover:bg-rose-500/18 dark:hover:text-rose-300",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                  )}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-5 text-sm text-muted-foreground">
                      暂无新提醒。完成打卡或任务后，新的提醒会出现在这里。
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/60 bg-surface-2/80 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/55">
                  最近学习
                </p>
                <Link
                  href={ROUTES.history}
                  className="flex items-center gap-1 text-[12px] text-brand transition-colors hover:text-brand/80"
                >
                  查看更多
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {visibleRecentPlans.length > 0 ? (
                <div className="space-y-1">
                  {visibleRecentPlans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={getRecentLearningPlanHref(plan.status)}
                      className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-3/90"
                      title={plan.title}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <div
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            plan.status === "completed"
                              ? "bg-brand"
                              : plan.status === "in_progress"
                                ? "bg-gold"
                                : "bg-muted-foreground/40",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] text-muted-foreground/55">
                            {formatPlanCreatedAt(plan.createdAt)}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {plan.title}
                          </p>
                        </div>
                      </div>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground/55">
                        {historyStatusLabel(plan.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
                  当前还没有学习计划记录。开始创建并完成第一个关卡后，这里会显示你的学习计划列表。
                </div>
              )}
            </div>

            {children ? <div className="space-y-3">{children}</div> : null}

            {footerContent ? (
              <div className="rounded-[24px] border border-border/60 bg-surface-2/80 p-4">
                {footerContent}
              </div>
            ) : null}
          </div>
        </div>

        {showSettings ? (
          <div className="flex shrink-0 items-center gap-2 border-t border-border/50 px-4 py-2.5">
            <SettingsPopover
              className="min-w-0 flex-1"
              onProfileSaved={handleProfileSaved}
            />
            {onToggleCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onToggleCollapsed}
                    aria-label="收起侧栏"
                    title="收起侧栏"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  收起侧栏
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ) : onToggleCollapsed ? (
          <div className="flex shrink-0 justify-end border-t border-border/50 px-4 py-2.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleCollapsed}
                  aria-label="收起侧栏"
                  title="收起侧栏"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                收起侧栏
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </aside>
      {dialogs}
    </>
  );
}
