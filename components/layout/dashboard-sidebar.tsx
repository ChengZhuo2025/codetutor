"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Code2,
  Crown,
  Flame,
  Star,
} from "lucide-react";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { useAppToast } from "@/components/app-feedback/app-toast-provider";
import { NotificationDetailDialog } from "@/components/layout/notification-detail-dialog";
import { ProfileEditDialog } from "@/components/layout/profile-edit-dialog";
import { SubscriptionDetailDialog } from "@/components/layout/subscription-detail-dialog";
import { SettingsPopover } from "@/components/layout/settings-popover";
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth";
import type { NotificationInAppItem } from "@/lib/api/contracts/notifications";
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
};

type NotificationPanelState = {
  expanded: boolean;
  selectedNotification: NotificationInAppItem | null;
  dialogOpen: boolean;
};

const SUBSCRIPTION_PLACEHOLDER: SubscriptionSnapshot = {
  planName: "个人版",
  planPriceLabel: "¥39/月",
  billingCycleLabel: "按月订阅",
  expiresAt: "无期限",
  remainingDays: 0,
  quotaLabel: "支付与订阅接口待接入",
  renewalHint: "当前为产品原型阶段，订阅信息仍使用静态占位。",
  primaryActionLabel: "升级套餐",
  secondaryActionLabel: "立即续费",
};

export function DashboardSidebar({
  items,
  widthClass = "w-64",
  showSettings = true,
  className,
  children,
  footerContent,
}: DashboardSidebarProps) {
  const toast = useAppToast();
  const {
    profile,
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

      toast.info(item.title, item.content);
      window.sessionStorage.setItem(sessionKey, "1");
    }
  }, [notifications, toast]);

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
  };

  const resolvedProfile = displayProfile ?? fallbackProfile;
  const subscription = SUBSCRIPTION_PLACEHOLDER;
  const progressPercent = Math.min(
    Math.round((resolvedProfile.currentScore / 1000) * 100),
    100,
  );
  const visibleRecentPlans = recentLearningPlans.slice(0, 5);

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

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-border/50 bg-sidebar",
        widthClass,
        className,
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">{APP_NAME}</span>
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
              className="block rounded-xl transition-colors hover:bg-background/40 -mx-1 px-1 py-1"
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {resolvedProfile.currentScore} / 1000 XP
                </span>
                <span className="text-muted-foreground">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
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
                    <p className="text-sm font-bold text-gold">
                      {resolvedProfile.streakDays} 天
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5">
                  <Star className="h-4 w-4 text-brand" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">已完成</p>
                    <p className="text-sm font-bold">
                      {resolvedProfile.completedTaskCount} 关
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {profileFeedbackMessage ? (
              <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {profileFeedbackMessage}
              </div>
            ) : null}
          </div>

          <ProfileEditDialog
            open={profileOpen}
            onOpenChange={setProfileOpen}
            onSaved={handleProfileSaved}
          />

          <NotificationDetailDialog
            open={notifPanel.dialogOpen}
            onOpenChange={(open) =>
              setNotifPanel((p) => ({ ...p, dialogOpen: open }))
            }
            notification={notifPanel.selectedNotification}
            onMarkRead={markNotificationRead}
            onDismiss={dismissNotification}
          />

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
                      ? "bg-brand-dim text-brand"
                      : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* 学习提醒折叠卡片 */}
          <div className="relative rounded-[24px] border border-border/60 bg-surface-2/80 overflow-hidden">
            {/* 折叠头部：可点击切换展开状态 */}
            <button
              type="button"
              onClick={() =>
                setNotifPanel((p) => ({ ...p, expanded: !p.expanded }))
              }
              className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-background/40"
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
                      : "已读完"}
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

            {/* 折叠内容 */}
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
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setNotifPanel((p) => ({
                              ...p,
                              selectedNotification: item,
                              dialogOpen: true,
                            }))
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background/50 active:bg-background/70"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
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
                              {item.title}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                              isUnread
                                ? "border-brand/30 bg-brand/10 text-brand"
                                : "border-border/80 bg-background/40 text-muted-foreground",
                            )}
                          >
                            {isUnread ? "未读" : "已读"}
                          </span>
                        </button>
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
                  <button
                    key={plan.id}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-3"
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
                        <p className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground/55">
                          {plan.tool} · {plan.level}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {plan.title}
                        </p>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground/55">
                      {historyStatusLabel(plan.status)}
                    </span>
                  </button>
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

      {showSettings && (
        <div className="shrink-0 border-t border-border/50 px-4 py-2.5">
          <SettingsPopover onProfileSaved={handleProfileSaved} />
        </div>
      )}
    </aside>
  );
}
