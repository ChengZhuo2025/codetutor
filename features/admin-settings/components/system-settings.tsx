"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Activity,
  BadgeCheck,
  Building2,
  Code2,
  Database,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Server,
  Shield,
  Sparkles,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import type { AdminRoleCode } from "@/lib/api/contracts/admin";
import type {
  AdminAlipayPaymentSettingsResponseData,
  AdminSubscriptionPlanListResponseData,
  AdminUpdateAlipayPaymentSettingsRequest,
  AdminUpsertSubscriptionPlanRequest,
  AdminUpdateWechatPaymentSettingsRequest,
  AdminWechatPaymentSettingsResponseData,
  SubscriptionPlanItem,
} from "@/lib/api/contracts/payment";
import type {
  AdminSettingsAdminAccountListItem,
  AdminSettingsAdminAccountListResponseData,
  AdminSettingsAuditLogListItem,
  AdminSettingsAuditLogListResponseData,
  AdminSettingsOverviewResponseData,
  AdminSiteContactResponseData,
  ContactChannelConfig,
  UpdateSiteContactRequest,
} from "@/lib/api/contracts/admin-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatePanel } from "@/components/ui/state-panel";
import { Plus, Trash2 } from "lucide-react";
import { useAppConfirm } from "@/components/app-feedback/app-confirm-provider";
import { useAppToast } from "@/components/app-feedback/app-toast-provider";
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer";
import { AdminListTag } from "@/features/admin-shell/components/admin-list-tag";
import { AdminSelect } from "@/features/admin-shell/components/admin-select";
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect";
import { usePublicSite } from "@/features/site/providers/public-site-provider";
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client";
import { cn } from "@/lib/utils";

type SettingsTab =
  | "accounts"
  | "roles"
  | "plans"
  | "payment"
  | "contact"
  | "audit"
  | "system";

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "accounts", label: "管理员账号" },
  { id: "roles", label: "角色权限" },
  { id: "plans", label: "订阅套餐" },
  { id: "payment", label: "支付配置" },
  { id: "contact", label: "联系方式" },
  { id: "audit", label: "操作审计" },
  { id: "system", label: "系统信息" },
];

const SYSTEM_PROJECT_INFO = {
  productionDomain: "www.codetutor.cn",
  companyName: "上海智酷数能科技有限公司",
};

const SYSTEM_TEAM_MEMBERS = [
  {
    role: "产品负责人 / 项目 Owner",
    name: "大包子",
    description: "负责产品方向、业务验收、运营配置与发布决策。",
  },
  {
    role: "AI 编程协作者",
    name: "Codex (GPT-5.5)",
    description: "参与需求拆解、代码实现、测试验证、文档同步与工程质量检查。",
  },
];

const SYSTEM_MAINTAINER = {
  name: "大包子",
  phone: "18600165902",
  email: "baoyouhua@zhicool.cn",
  wechat: "baoyouhua",
};

const EMPTY_PLAN_FORM: AdminUpsertSubscriptionPlanRequest = {
  code: "",
  name: "",
  priceCents: 0,
  currency: "CNY",
  durationDays: 31,
  tierRank: 0,
  description: "",
  features: [""],
  periodLabel: "/月",
  ctaLabel: "立即订阅",
  highlight: false,
  purchasable: true,
  active: true,
  displayOrder: 0,
};

const ROLE_LABELS: Record<AdminRoleCode, string> = {
  super_admin: "超级管理员",
  support_admin: "客服管理员",
  ops_admin: "运营管理员",
  ai_ops_admin: "Ai 管理管理员",
};

const ROLE_BADGE_CLASS: Record<AdminRoleCode, string> = {
  super_admin:
    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  support_admin:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ops_admin:
    "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  ai_ops_admin:
    "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "启用";
    case "inactive":
      return "停用";
    case "suspended":
      return "冻结";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "inactive":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "suspended":
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "border-border bg-muted/60 text-muted-foreground";
  }
}

function getAuditActionLabel(action: string) {
  switch (action) {
    case "login":
      return "登录";
    case "logout":
      return "登出";
    case "password_change":
      return "修改密码";
    case "admin_account_activate":
      return "启用管理员";
    case "admin_account_deactivate":
      return "停用管理员";
    case "user_profile_update":
      return "更新用户资料";
    case "user_soft_delete":
      return "软删除用户";
    case "user_restore":
      return "恢复用户";
    case "learning_path_status_update":
      return "学习计划状态调整";
    case "site_contact_update":
      return "更新企业联系方式";
    case "payment_settings_update":
      return "更新微信支付配置";
    case "alipay_payment_settings_update":
      return "更新支付宝支付配置";
    default:
      return action;
  }
}

function RoleBadge({ role }: { role: AdminRoleCode }) {
  return (
    <AdminListTag className={ROLE_BADGE_CLASS[role]}>
      {ROLE_LABELS[role]}
    </AdminListTag>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tracking-tight text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AccountRowActions({
  canManage,
  currentAdminAccountId,
  item,
  actingId,
  onToggleStatus,
}: {
  canManage: boolean;
  currentAdminAccountId: string;
  item: AdminSettingsAdminAccountListItem;
  actingId: string | null;
  onToggleStatus: (item: AdminSettingsAdminAccountListItem) => Promise<void>;
}) {
  const isSelf = currentAdminAccountId === item.adminAccountId;
  const disabled = actingId === item.adminAccountId || isSelf || !canManage;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2.5"
        disabled={disabled}
        onClick={() => void onToggleStatus(item)}
      >
        {item.status === "active"
          ? actingId === item.adminAccountId
            ? "停用中…"
            : "停用"
          : actingId === item.adminAccountId
            ? "启用中…"
            : "启用"}
      </Button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <StatePanel status="empty" title="暂无数据" description={text} />;
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right text-foreground",
          mono ? "font-mono text-xs" : "",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function SystemSettings() {
  const confirm = useAppConfirm();
  const toast = useAppToast();
  const { site } = usePublicSite();
  const siteInformation = site.information;
  const [activeTab, setActiveTab] = useState<SettingsTab>("accounts");
  const [overview, setOverview] =
    useState<AdminSettingsOverviewResponseData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  const [accountKeyword, setAccountKeyword] = useState("");
  const [accountKeywordApplied, setAccountKeywordApplied] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");
  const [accountPage, setAccountPage] = useState(1);
  const [accountLimit, setAccountLimit] = useState("20");
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountData, setAccountData] =
    useState<AdminSettingsAdminAccountListResponseData | null>(null);
  const [actingAdminAccountId, setActingAdminAccountId] = useState<
    string | null
  >(null);

  const [auditKeyword, setAuditKeyword] = useState("");
  const [auditKeywordApplied, setAuditKeywordApplied] = useState("");
  const [auditAction, setAuditAction] = useState("all");
  const [auditTargetType, setAuditTargetType] = useState("all");
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState("20");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditData, setAuditData] =
    useState<AdminSettingsAuditLogListResponseData | null>(null);

  const [contactData, setContactData] =
    useState<AdminSiteContactResponseData | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editForm, setEditForm] = useState<UpdateSiteContactRequest>({
    companyName: "",
    address: "",
    website: "",
    contactEmail: "",
    serviceHours: "",
    contactChannels: [],
  });
  const [paymentData, setPaymentData] =
    useState<AdminWechatPaymentSettingsResponseData | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] =
    useState<AdminUpdateWechatPaymentSettingsRequest>({
      enabled: false,
      appId: "",
      mchId: "",
      notifyUrl: "https://www.codetutor.cn/api/payment/wechat/notify",
      merchantSerialNo: "",
      merchantPrivateKeyPem: "",
      apiV3Key: "",
      wechatpayPublicKeyId: "",
      wechatpayPublicKeyPem: "",
    });
  const [alipayData, setAlipayData] =
    useState<AdminAlipayPaymentSettingsResponseData | null>(null);
  const [alipayForm, setAlipayForm] =
    useState<AdminUpdateAlipayPaymentSettingsRequest>({
      enabled: false,
      appId: "",
      notifyUrl: "https://www.codetutor.cn/api/payment/alipay/notify",
      appPrivateKeyPem: "",
      alipayPublicKeyPem: "",
    });
  const [planData, setPlanData] =
    useState<AdminSubscriptionPlanListResponseData | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansSaving, setPlansSaving] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [planForm, setPlanForm] =
    useState<AdminUpsertSubscriptionPlanRequest>(EMPTY_PLAN_FORM);

  useAdminSessionExpiryRedirect(authExpired);

  const canManageAccounts =
    overview?.currentAdmin.roles.includes("super_admin") ?? false;

  const refreshOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const result = await adminRequestData<AdminSettingsOverviewResponseData>(
        "/admin/settings/overview",
        { method: "GET" },
        "获取系统设置概览失败",
      );
      setOverview(result);
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      setOverviewError(getAdminApiErrorMessage(error, "获取系统设置概览失败"));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", accountStatus);
      params.set("limit", accountLimit);
      params.set("page", String(accountPage));
      if (accountKeywordApplied) {
        params.set("keyword", accountKeywordApplied);
      }
      const result =
        await adminRequestData<AdminSettingsAdminAccountListResponseData>(
          `/admin/settings/admin-accounts?${params.toString()}`,
          { method: "GET" },
          "获取管理员账号列表失败",
        );
      setAccountData(result);
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      setAccountsError(
        getAdminApiErrorMessage(error, "获取管理员账号列表失败"),
      );
    } finally {
      setAccountsLoading(false);
    }
  }, [accountKeywordApplied, accountLimit, accountPage, accountStatus]);

  const refreshAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params = new URLSearchParams();
      params.set("action", auditAction);
      params.set("targetType", auditTargetType);
      params.set("limit", auditLimit);
      params.set("page", String(auditPage));
      if (auditKeywordApplied) {
        params.set("keyword", auditKeywordApplied);
      }
      const result =
        await adminRequestData<AdminSettingsAuditLogListResponseData>(
          `/admin/settings/audit-logs?${params.toString()}`,
          { method: "GET" },
          "获取操作审计失败",
        );
      setAuditData(result);
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      setAuditError(getAdminApiErrorMessage(error, "获取操作审计失败"));
    } finally {
      setAuditLoading(false);
    }
  }, [
    auditAction,
    auditKeywordApplied,
    auditLimit,
    auditPage,
    auditTargetType,
  ]);

  const refreshContact = useCallback(async () => {
    setContactLoading(true);
    setContactError(null);
    try {
      const result = await adminRequestData<AdminSiteContactResponseData>(
        "/admin/settings/contact",
        { method: "GET" },
        "获取企业联系方式失败",
      );
      setContactData(result);
      if (!isEditingContact) {
        setEditForm({
          companyName: result.companyName,
          address: result.address,
          website: result.website,
          contactEmail: result.contactEmail,
          serviceHours: result.serviceHours,
          contactChannels: result.contactChannels,
        });
      }
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      setContactError(getAdminApiErrorMessage(error, "获取企业联系方式失败"));
    } finally {
      setContactLoading(false);
    }
  }, [isEditingContact]);

  const refreshPayment = useCallback(async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const result =
        await adminRequestData<AdminWechatPaymentSettingsResponseData>(
          "/admin/settings/payment/wechat",
          { method: "GET" },
          "获取微信支付配置失败",
        );
      setPaymentData(result);
      setPaymentForm((prev) => ({
        ...prev,
        enabled: result.enabled,
        appId: result.appId ?? "",
        mchId: result.mchId ?? "",
        notifyUrl: result.notifyUrl ?? "https://www.codetutor.cn/api/payment/wechat/notify",
        merchantSerialNo: result.merchantSerialNo ?? "",
        wechatpayPublicKeyId: result.wechatpayPublicKeyId ?? "",
      }));
      const alipay =
        await adminRequestData<AdminAlipayPaymentSettingsResponseData>(
          "/admin/settings/payment/alipay",
          { method: "GET" },
          "获取支付宝支付配置失败",
        );
      setAlipayData(alipay);
      setAlipayForm(() => ({
        enabled: alipay.enabled,
        appId: alipay.appId ?? "",
        notifyUrl: alipay.notifyUrl ?? "https://www.codetutor.cn/api/payment/alipay/notify",
        appPrivateKeyPem: "",
        alipayPublicKeyPem: "",
      }));
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      setPaymentError(getAdminApiErrorMessage(error, "获取微信支付配置失败"));
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  const refreshPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const result =
        await adminRequestData<AdminSubscriptionPlanListResponseData>(
          "/admin/settings/subscription-plans",
          { method: "GET" },
          "获取订阅套餐失败",
        );
      setPlanData(result);
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      setPlansError(getAdminApiErrorMessage(error, "获取订阅套餐失败"));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  useEffect(() => {
    if (activeTab === "accounts") {
      void refreshAccounts();
    }
    if (activeTab === "audit") {
      void refreshAuditLogs();
    }
    if (activeTab === "contact" || activeTab === "system") {
      void refreshContact();
    }
    if (activeTab === "payment") {
      void refreshPayment();
    }
    if (activeTab === "plans") {
      void refreshPlans();
    }
  }, [
    activeTab,
    refreshAccounts,
    refreshAuditLogs,
    refreshContact,
    refreshPayment,
    refreshPlans,
    refreshOverview,
  ]);

  useEffect(() => {
    if (activeTab === "contact" && contactData) {
      setEditForm({
        companyName: contactData.companyName,
        address: contactData.address,
        website: contactData.website,
        contactEmail: contactData.contactEmail,
        serviceHours: contactData.serviceHours,
        contactChannels: contactData.contactChannels,
      });
    }
  }, [activeTab, contactData]);

  const accountTotalPages = Math.max(
    1,
    Math.ceil(
      (accountData?.total ?? 0) / (Number.parseInt(accountLimit, 10) || 20),
    ) || 1,
  );

  const auditTotalPages = Math.max(
    1,
    Math.ceil(
      (auditData?.total ?? 0) / (Number.parseInt(auditLimit, 10) || 20),
    ) || 1,
  );

  const handleToggleAccountStatus = async (
    item: AdminSettingsAdminAccountListItem,
  ) => {
    const nextAction = item.status === "active" ? "deactivate" : "activate";
    const result = await confirm.prompt({
      title:
        nextAction === "deactivate"
          ? "确认停用该管理员？"
          : "确认启用该管理员？",
      description:
        nextAction === "deactivate"
          ? "停用后该管理员将无法继续登录管理后台。"
          : "启用后该管理员可继续使用已有权限登录管理后台。",
      confirmText: nextAction === "deactivate" ? "确认停用" : "确认启用",
      cancelText: "取消",
      destructive: nextAction === "deactivate",
      input: {
        label: "原因（可选）",
        placeholder: "可填写本次账号状态调整原因",
        defaultValue: "",
        multiline: true,
      },
    });

    if (!result.confirmed) {
      return;
    }

    setActingAdminAccountId(item.adminAccountId);

    try {
      await adminRequestData(
        `/admin/settings/admin-accounts/${item.adminAccountId}/status`,
        {
          method: "POST",
          body: JSON.stringify({
            action: nextAction,
            reason: result.value.trim() || null,
          }),
        },
        "更新管理员账号状态失败",
      );
      toast.success(
        nextAction === "deactivate" ? "管理员账号已停用" : "管理员账号已启用",
      );
      await Promise.all([
        refreshOverview(),
        refreshAccounts(),
        activeTab === "audit" ? refreshAuditLogs() : Promise.resolve(),
      ]);
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      toast.error(getAdminApiErrorMessage(error, "更新管理员账号状态失败"));
    } finally {
      setActingAdminAccountId(null);
    }
  };

  const renderAccountsTab = () => {
    const stats = accountData?.stats ?? overview?.stats;
    const listItems = accountData?.items ?? [];

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard
            label="管理员总数"
            value={stats?.totalAdminAccounts ?? 0}
            icon={Users}
          />
          <MetricCard
            label="启用中"
            value={stats?.activeAdminAccounts ?? 0}
            icon={Shield}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <MetricCard
            label="已停用"
            value={stats?.inactiveAdminAccounts ?? 0}
            icon={UserCog}
            valueClassName="text-amber-600 dark:text-amber-400"
          />
          <MetricCard
            label="已冻结"
            value={stats?.suspendedAdminAccounts ?? 0}
            icon={Lock}
            valueClassName="text-rose-600 dark:text-rose-400"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 min-w-32 max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={accountKeyword}
                  onChange={(event) => setAccountKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setAccountPage(1);
                      setAccountKeywordApplied(accountKeyword.trim());
                    }
                  }}
                  className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="搜索管理员姓名、邮箱、用户 ID"
                />
              </div>
              <AdminSelect
                value={accountStatus}
                onValueChange={(next) => {
                  setAccountStatus(next);
                  setAccountPage(1);
                }}
                options={[
                  { value: "all", label: "全部状态" },
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "停用" },
                  { value: "suspended", label: "冻结" },
                ]}
                triggerClassName="h-10 min-w-[7rem] shrink-0"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAccountPage(1);
                  setAccountKeywordApplied(accountKeyword.trim());
                }}
              >
                搜索
              </Button>
              {!canManageAccounts ? (
                <span className="text-xs text-muted-foreground">
                  仅超级管理员可操作
                </span>
              ) : null}
            </div>
          </div>

          {accountsError ? (
            <div className="px-4 py-6">
              <StatePanel
                status="error"
                title="获取管理员账号列表失败"
                description={accountsError}
              />
            </div>
          ) : accountsLoading && !accountData ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              加载中…
            </div>
          ) : listItems.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyHint text="暂无符合条件的管理员账号。" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3">账号</th>
                      <th className="px-4 py-3">邮箱</th>
                      <th className="px-4 py-3">角色权限</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">最后登录</th>
                      <th className="px-4 py-3">创建时间</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listItems.map((item) => (
                      <tr
                        key={item.adminAccountId}
                        className="border-b border-border/80 last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                              {item.avatarUrl ? (
                                <Image
                                  src={item.avatarUrl}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-sm font-semibold text-primary">
                                  {item.displayName.slice(0, 1)}
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground">
                                {item.displayName}
                              </p>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                {item.userId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.email ?? "暂无邮箱"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.roles.map((role) => (
                              <RoleBadge key={role} role={role} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <AdminListTag
                            className={getStatusBadgeClass(item.status)}
                          >
                            {getStatusLabel(item.status)}
                          </AdminListTag>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(item.lastLoginAt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {overview ? (
                            <AccountRowActions
                              canManage={canManageAccounts}
                              currentAdminAccountId={
                                overview.currentAdmin.adminAccountId
                              }
                              item={item}
                              actingId={actingAdminAccountId}
                              onToggleStatus={handleToggleAccountStatus}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminListPaginationFooter
                limit={accountLimit}
                onLimitChange={(value) => {
                  setAccountLimit(value);
                  setAccountPage(1);
                }}
                page={accountPage}
                totalPages={accountTotalPages}
                total={accountData?.total ?? 0}
                canPrev={accountPage > 1}
                canNext={accountPage < accountTotalPages}
                isLoading={accountsLoading}
                onPrevPage={() =>
                  setAccountPage((page) => Math.max(1, page - 1))
                }
                onNextPage={() =>
                  setAccountPage((page) =>
                    Math.min(accountTotalPages, page + 1),
                  )
                }
              />
            </>
          )}
        </div>
      </div>
    );
  };

  const renderRolesTab = () => {
    if (overviewLoading) {
      return (
        <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          加载中…
        </div>
      );
    }

    if (overviewError || !overview) {
      return (
        <StatePanel
          status="error"
          title="获取角色权限失败"
          description={overviewError ?? "请稍后再试。"}
        />
      );
    }

    return (
      <div className="space-y-4">
        {overview.roleDefinitions.map((role) => (
          <div
            key={role.code}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={role.code} />
                  <span className="text-sm font-medium text-foreground">
                    {role.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    共 {role.accountCount} 个账号
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {role.description ?? "当前角色描述暂未补充。"}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          当前角色权限由代码和服务端守卫控制，本轮系统设置只提供角色权限说明，不支持后台自定义角色或在线改权限。
        </div>
      </div>
    );
  };

  const renderAuditTab = () => {
    const items = auditData?.items ?? [];

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={auditKeyword}
                  onChange={(event) => setAuditKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setAuditPage(1);
                      setAuditKeywordApplied(auditKeyword.trim());
                    }
                  }}
                  className="pl-9"
                  placeholder="搜索操作审计、原因、目标类型"
                />
              </div>
              <AdminSelect
                value={auditAction}
                onValueChange={(next) => {
                  setAuditAction(next);
                  setAuditPage(1);
                }}
                options={[
                  { value: "all", label: "全部操作" },
                  { value: "login", label: "登录" },
                  { value: "logout", label: "登出" },
                  { value: "password_change", label: "修改密码" },
                  { value: "admin_account_activate", label: "启用管理员" },
                  { value: "admin_account_deactivate", label: "停用管理员" },
                  { value: "site_contact_update", label: "更新联系方式" },
                  { value: "user_profile_update", label: "更新用户资料" },
                  { value: "user_soft_delete", label: "软删除用户" },
                  { value: "user_restore", label: "恢复用户" },
                  {
                    value: "learning_path_status_update",
                    label: "学习计划状态调整",
                  },
                ]}
                triggerClassName="h-10 min-w-[9rem] max-w-[14rem] shrink-0"
              />
              <AdminSelect
                value={auditTargetType}
                onValueChange={(next) => {
                  setAuditTargetType(next);
                  setAuditPage(1);
                }}
                options={[
                  { value: "all", label: "全部目标类型" },
                  { value: "admin_account", label: "管理员账号" },
                  { value: "user_profile", label: "用户资料" },
                  { value: "user_learning_path", label: "学习计划" },
                  { value: "site_contact", label: "企业联系方式" },
                ]}
                triggerClassName="h-10 min-w-[9rem] shrink-0"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAuditPage(1);
                setAuditKeywordApplied(auditKeyword.trim());
              }}
            >
              搜索
            </Button>
          </div>

          {auditError ? (
            <div className="px-4 py-6">
              <StatePanel
                status="error"
                title="获取操作审计失败"
                description={auditError}
              />
            </div>
          ) : auditLoading && !auditData ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              加载中…
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyHint text="暂无符合条件的操作审计记录。" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3">操作</th>
                      <th className="px-4 py-3">操作人</th>
                      <th className="px-4 py-3">目标类型</th>
                      <th className="px-4 py-3">原因</th>
                      <th className="px-4 py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: AdminSettingsAuditLogListItem) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/80 last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">
                              {getAuditActionLabel(item.action)}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {item.id}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.actorDisplayName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.targetType}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.reason ?? "暂无原因"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminListPaginationFooter
                limit={auditLimit}
                onLimitChange={(value) => {
                  setAuditLimit(value);
                  setAuditPage(1);
                }}
                page={auditPage}
                totalPages={auditTotalPages}
                total={auditData?.total ?? 0}
                canPrev={auditPage > 1}
                canNext={auditPage < auditTotalPages}
                isLoading={auditLoading}
                onPrevPage={() => setAuditPage((page) => Math.max(1, page - 1))}
                onNextPage={() =>
                  setAuditPage((page) => Math.min(auditTotalPages, page + 1))
                }
              />
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSystemTab = () => {
    if (overviewLoading) {
      return (
        <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          加载中…
        </div>
      );
    }

    if (overviewError || !overview) {
      return (
        <StatePanel
          status="error"
          title="获取系统信息失败"
          description={overviewError ?? "请稍后再试。"}
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            label="7 日操作审计"
            value={overview.stats.auditLogCountLast7Days}
            icon={Activity}
          />
          <MetricCard
            label="启用管理员"
            value={overview.stats.activeAdminAccounts}
            icon={Users}
          />
          <MetricCard
            label="角色数"
            value={overview.roleDefinitions.length}
            icon={Shield}
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">网站信息</h2>
            </div>
            <dl className="space-y-3.5 text-sm">
              <InfoRow label="网站名称" value={siteInformation.siteName} />
              <InfoRow label="副标题" value={siteInformation.siteSubtitle} />
              <InfoRow label="版本号" value={siteInformation.version} mono />
              <InfoRow label="站点域名" value={contactData?.website || SYSTEM_PROJECT_INFO.productionDomain} mono />
              <InfoRow label="运营主体" value={contactData?.companyName || SYSTEM_PROJECT_INFO.companyName} />
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">开发团队</h2>
            </div>
            <div className="space-y-4">
              {SYSTEM_TEAM_MEMBERS.map((member) => (
                <div key={member.role} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {member.name}
                    </span>
                    <AdminListTag className="border-primary/20 bg-primary/10 text-primary">
                      {member.role}
                    </AdminListTag>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground line-clamp-1">
                    {member.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">维护联系人</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  昵称
                </span>
                <span className="font-medium text-foreground">
                  {SYSTEM_MAINTAINER.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md px-0 py-1">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  微信号
                </span>
                <span className="font-mono text-xs">{SYSTEM_MAINTAINER.wechat}</span>
              </div>
              <a
                href={`tel:${SYSTEM_MAINTAINER.phone}`}
                className="flex items-center justify-between gap-4 rounded-md px-0 py-1 text-foreground hover:text-primary"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  手机号
                </span>
                <span className="font-mono text-xs">{SYSTEM_MAINTAINER.phone}</span>
              </a>
              <a
                href={`mailto:${SYSTEM_MAINTAINER.email}`}
                className="flex items-center justify-between gap-4 rounded-md px-0 py-1 text-foreground hover:text-primary"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  邮箱
                </span>
                <span className="font-mono text-xs">{SYSTEM_MAINTAINER.email}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">网站展示内容</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Slogan" value={siteInformation.siteSlogan} />
              <InfoRow label="网站简介" value={siteInformation.siteDescription} />
              <InfoRow label="SEO 关键词" value={siteInformation.seoKeywords.join("、") || "未配置"} />
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">应用与基础设施</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <InfoRow label="应用名称" value={overview.systemInfo.appName} />
              <InfoRow label="应用版本" value={overview.systemInfo.appVersion} mono />
              <InfoRow label="Next.js" value={overview.systemInfo.nextVersion ?? "未知"} mono />
              <InfoRow label="React" value={overview.systemInfo.reactVersion ?? "未知"} mono />
              <InfoRow label="管理员认证" value={overview.systemInfo.adminAuthMode} />
              <InfoRow label="数据库" value={overview.systemInfo.database} />
              <InfoRow label="对象存储" value={overview.systemInfo.storage} />
              <InfoRow label="用户认证" value={overview.systemInfo.auth} />
            </dl>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">合规与版权</h2>
          </div>
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-muted-foreground">版权声明</p>
              <p className="text-foreground">{siteInformation.copyright}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">ICP备案号</p>
              {siteInformation.icpNumber ? (
                <a
                  href="https://beian.miit.gov.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {siteInformation.icpNumber}
                </a>
              ) : (
                <p className="text-foreground">未配置</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">内部说明</p>
              <p className="text-foreground">
                本页仅后台展示，用于运维交接、合规核验和发布前检查。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSavePayment = async () => {
    const result = await confirm.prompt({
      title: "确认保存微信支付配置？",
      description:
        "商户私钥、APIv3 密钥和微信支付公钥会加密存储到数据库。保存后用户端可创建真实扫码支付订单。",
      confirmText: "保存配置",
      cancelText: "取消",
    });

    if (!result.confirmed) return;

    setPaymentSaving(true);
    try {
      await adminRequestData<AdminWechatPaymentSettingsResponseData>(
        "/admin/settings/payment/wechat",
        {
          method: "PATCH",
          body: JSON.stringify(paymentForm),
        },
        "更新微信支付配置失败",
      );
      toast.success("微信支付配置更新成功");
      await refreshPayment();
      await refreshOverview();
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      toast.error(getAdminApiErrorMessage(error, "更新微信支付配置失败"));
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleSaveAlipayPayment = async () => {
    const result = await confirm.prompt({
      title: "确认保存支付宝支付配置？",
      description:
        "支付宝应用私钥和支付宝公钥会加密存储到数据库。保存后用户端可选择支付宝扫码支付。",
      confirmText: "保存配置",
      cancelText: "取消",
    });

    if (!result.confirmed) return;

    setPaymentSaving(true);
    try {
      await adminRequestData<AdminAlipayPaymentSettingsResponseData>(
        "/admin/settings/payment/alipay",
        {
          method: "PATCH",
          body: JSON.stringify(alipayForm),
        },
        "更新支付宝支付配置失败",
      );
      toast.success("支付宝支付配置更新成功");
      await refreshPayment();
      await refreshOverview();
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      toast.error(getAdminApiErrorMessage(error, "更新支付宝支付配置失败"));
    } finally {
      setPaymentSaving(false);
    }
  };

  const updatePaymentField = <K extends keyof AdminUpdateWechatPaymentSettingsRequest>(
    field: K,
    value: AdminUpdateWechatPaymentSettingsRequest[K],
  ) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateAlipayField = <K extends keyof AdminUpdateAlipayPaymentSettingsRequest>(
    field: K,
    value: AdminUpdateAlipayPaymentSettingsRequest[K],
  ) => {
    setAlipayForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderPaymentTab = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">微信支付 Native 扫码支付</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              凭据不会写入 .env；商户私钥、APIv3 密钥、微信支付公钥会使用服务端主密钥加密后落库。
            </p>
          </div>
          <AdminListTag className={paymentData?.configured ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-amber-500/20 bg-amber-500/10 text-amber-700"}>
            {paymentData?.configured ? "已配置" : "未完整配置"}
          </AdminListTag>
        </div>

        {paymentError ? (
          <StatePanel status="error" title="读取失败" description={paymentError} />
        ) : paymentLoading ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            加载中…
          </div>
        ) : (
          <div className="space-y-5">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={paymentForm.enabled === true}
                onChange={(event) => updatePaymentField("enabled", event.target.checked)}
              />
              启用微信支付
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment-app-id">AppID</Label>
                <Input id="payment-app-id" value={paymentForm.appId ?? ""} onChange={(event) => updatePaymentField("appId", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-mch-id">商户号 mchid</Label>
                <Input id="payment-mch-id" value={paymentForm.mchId ?? ""} onChange={(event) => updatePaymentField("mchId", event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="payment-notify-url">支付回调地址</Label>
                <Input id="payment-notify-url" value={paymentForm.notifyUrl ?? ""} onChange={(event) => updatePaymentField("notifyUrl", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-serial-no">商户证书序列号</Label>
                <Input id="payment-serial-no" value={paymentForm.merchantSerialNo ?? ""} onChange={(event) => updatePaymentField("merchantSerialNo", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-public-key-id">微信支付公钥 ID</Label>
                <Input id="payment-public-key-id" value={paymentForm.wechatpayPublicKeyId ?? ""} onChange={(event) => updatePaymentField("wechatpayPublicKeyId", event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="payment-api-v3-key">APIv3 密钥</Label>
                <Input id="payment-api-v3-key" type="password" value={paymentForm.apiV3Key ?? ""} placeholder={paymentData?.apiV3KeyMasked ?? "32 字节密钥"} onChange={(event) => updatePaymentField("apiV3Key", event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="payment-private-key">商户私钥 apiclient_key.pem</Label>
                <Textarea id="payment-private-key" rows={6} value={paymentForm.merchantPrivateKeyPem ?? ""} placeholder={paymentData?.merchantPrivateKeyMasked ?? "-----BEGIN PRIVATE KEY-----"} onChange={(event) => updatePaymentField("merchantPrivateKeyPem", event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="payment-public-key">微信支付公钥</Label>
                <Textarea id="payment-public-key" rows={6} value={paymentForm.wechatpayPublicKeyPem ?? ""} placeholder={paymentData?.wechatpayPublicKeyMasked ?? "-----BEGIN PUBLIC KEY-----"} onChange={(event) => updatePaymentField("wechatpayPublicKeyPem", event.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => void refreshPayment()} disabled={paymentSaving}>
                重新读取
              </Button>
              <Button type="button" onClick={() => void handleSavePayment()} disabled={paymentSaving}>
                {paymentSaving ? "保存中…" : "保存微信支付配置"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">支付宝扫码支付</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              使用支付宝开放平台普通公钥 RSA2 模式；应用私钥和支付宝公钥会加密落库。
            </p>
          </div>
          <AdminListTag className={alipayData?.configured ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-amber-500/20 bg-amber-500/10 text-amber-700"}>
            {alipayData?.configured ? "已配置" : "未完整配置"}
          </AdminListTag>
        </div>

        {paymentError ? null : paymentLoading ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            加载中…
          </div>
        ) : (
          <div className="space-y-5">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={alipayForm.enabled === true}
                onChange={(event) => updateAlipayField("enabled", event.target.checked)}
              />
              启用支付宝支付
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alipay-app-id">支付宝 AppID</Label>
                <Input id="alipay-app-id" value={alipayForm.appId ?? ""} onChange={(event) => updateAlipayField("appId", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alipay-sign-type">加签方式</Label>
                <Input id="alipay-sign-type" value="RSA2 普通公钥" readOnly />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="alipay-notify-url">支付宝异步通知地址</Label>
                <Input id="alipay-notify-url" value={alipayForm.notifyUrl ?? ""} onChange={(event) => updateAlipayField("notifyUrl", event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="alipay-private-key">支付宝应用私钥</Label>
                <Textarea id="alipay-private-key" rows={6} value={alipayForm.appPrivateKeyPem ?? ""} placeholder={alipayData?.appPrivateKeyMasked ?? "-----BEGIN PRIVATE KEY-----"} onChange={(event) => updateAlipayField("appPrivateKeyPem", event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="alipay-public-key">支付宝公钥</Label>
                <Textarea id="alipay-public-key" rows={6} value={alipayForm.alipayPublicKeyPem ?? ""} placeholder={alipayData?.alipayPublicKeyMasked ?? "-----BEGIN PUBLIC KEY-----"} onChange={(event) => updateAlipayField("alipayPublicKeyPem", event.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => void refreshPayment()} disabled={paymentSaving}>
                重新读取
              </Button>
              <Button type="button" onClick={() => void handleSaveAlipayPayment()} disabled={paymentSaving}>
                {paymentSaving ? "保存中…" : "保存支付宝支付配置"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const startCreatePlan = () => {
    setEditingPlanCode(null);
    setPlanForm(EMPTY_PLAN_FORM);
  };

  const startEditPlan = (plan: SubscriptionPlanItem) => {
    setEditingPlanCode(plan.code);
    setPlanForm({
      code: plan.code,
      name: plan.name,
      priceCents: plan.priceCents,
      currency: plan.currency,
      durationDays: plan.durationDays,
      tierRank: plan.tierRank,
      description: plan.description,
      features: plan.features.length > 0 ? plan.features : [""],
      periodLabel: plan.periodLabel,
      ctaLabel: plan.ctaLabel,
      highlight: plan.highlight,
      purchasable: plan.purchasable,
      active: plan.active,
      displayOrder: plan.displayOrder,
    });
  };

  const updatePlanField = <K extends keyof AdminUpsertSubscriptionPlanRequest>(
    field: K,
    value: AdminUpsertSubscriptionPlanRequest[K],
  ) => {
    setPlanForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePlanFeature = (index: number, value: string) => {
    setPlanForm((prev) => {
      const features = [...(prev.features ?? [])];
      features[index] = value;
      return { ...prev, features };
    });
  };

  const handleSavePlan = async () => {
    setPlansSaving(true);
    try {
      const payload = {
        ...planForm,
        features: (planForm.features ?? []).map((item) => item.trim()).filter(Boolean),
      };
      await adminRequestData(
        editingPlanCode
          ? `/admin/settings/subscription-plans/${editingPlanCode}`
          : "/admin/settings/subscription-plans",
        {
          method: editingPlanCode ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
        editingPlanCode ? "编辑套餐失败" : "创建套餐失败",
      );
      toast.success(editingPlanCode ? "编辑套餐成功" : "创建套餐成功");
      setEditingPlanCode(null);
      setPlanForm(EMPTY_PLAN_FORM);
      await refreshPlans();
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      toast.error(getAdminApiErrorMessage(error, editingPlanCode ? "编辑套餐失败" : "创建套餐失败"));
    } finally {
      setPlansSaving(false);
    }
  };

  const handleArchivePlan = async (plan: SubscriptionPlanItem) => {
    const result = await confirm.prompt({
      title: "确认归档套餐？",
      description: `归档套餐「${plan.name}」后，用户端不再展示且不可购买；历史订单和订阅记录会保留。`,
      confirmText: "归档套餐",
      cancelText: "取消",
      destructive: true,
    });
    if (!result.confirmed) return;
    try {
      await adminRequestData(
        `/admin/settings/subscription-plans/${plan.code}`,
        { method: "DELETE" },
        "归档套餐失败",
      );
      toast.success("归档套餐成功");
      await refreshPlans();
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      toast.error(getAdminApiErrorMessage(error, "归档套餐失败"));
    }
  };

  const renderPlansTab = () => {
    const plans = planData?.items ?? [];
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">订阅套餐</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                管理用户端首页与「套餐订阅与续费」弹窗展示的套餐。
              </p>
            </div>
            <Button type="button" onClick={startCreatePlan}>
              <Plus className="h-4 w-4" />
              创建套餐
            </Button>
          </div>
          {plansError ? (
            <div className="p-4">
              <StatePanel status="error" title="读取失败" description={plansError} />
            </div>
          ) : plansLoading && !planData ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">加载中…</div>
          ) : plans.length === 0 ? (
            <div className="p-4">
              <EmptyHint text="暂无订阅套餐。" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">套餐</th>
                    <th className="px-4 py-3">价格</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">排序</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.code} className="border-b border-border/80 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{plan.name}</p>
                            {plan.highlight ? <AdminListTag className="border-brand/20 bg-brand/10 text-brand">推荐</AdminListTag> : null}
                          </div>
                          <p className="font-mono text-[11px] text-muted-foreground">{plan.code}</p>
                          <p className="max-w-md text-xs text-muted-foreground">{plan.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        ¥{(plan.priceCents / 100).toFixed(2)}{plan.periodLabel}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <AdminListTag className={plan.active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-amber-500/20 bg-amber-500/10 text-amber-700"}>
                            {plan.active ? "上架" : "下架"}
                          </AdminListTag>
                          <AdminListTag className={plan.purchasable ? "border-sky-500/20 bg-sky-500/10 text-sky-700" : "border-muted bg-muted text-muted-foreground"}>
                            {plan.purchasable ? "可购买" : "仅展示"}
                          </AdminListTag>
                          {plan.archivedAt ? <AdminListTag className="border-rose-500/20 bg-rose-500/10 text-rose-700">已归档</AdminListTag> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{plan.displayOrder}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => startEditPlan(plan)}>
                            编辑套餐
                          </Button>
                          <Button type="button" variant="outline" size="sm" disabled={Boolean(plan.archivedAt)} onClick={() => void handleArchivePlan(plan)}>
                            归档套餐
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground">
            {editingPlanCode ? "编辑套餐" : "创建套餐"}
          </h3>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-code">套餐编码</Label>
              <Input id="plan-code" value={planForm.code ?? ""} disabled={Boolean(editingPlanCode)} onChange={(event) => updatePlanField("code", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-name">套餐名称</Label>
              <Input id="plan-name" value={planForm.name ?? ""} onChange={(event) => updatePlanField("name", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-price">价格（分）</Label>
                <Input id="plan-price" type="number" value={planForm.priceCents ?? 0} onChange={(event) => updatePlanField("priceCents", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-period">周期文案</Label>
                <Input id="plan-period" value={planForm.periodLabel ?? ""} onChange={(event) => updatePlanField("periodLabel", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-duration">有效期（天）</Label>
                <Input id="plan-duration" type="number" value={planForm.durationDays ?? 31} onChange={(event) => updatePlanField("durationDays", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-rank">等级</Label>
                <Input id="plan-rank" type="number" value={planForm.tierRank ?? 0} onChange={(event) => updatePlanField("tierRank", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-order">展示排序</Label>
                <Input id="plan-order" type="number" value={planForm.displayOrder ?? 0} onChange={(event) => updatePlanField("displayOrder", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-cta">按钮文案</Label>
                <Input id="plan-cta" value={planForm.ctaLabel ?? ""} onChange={(event) => updatePlanField("ctaLabel", event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">描述</Label>
              <Textarea id="plan-description" rows={3} value={planForm.description ?? ""} onChange={(event) => updatePlanField("description", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>权益列表</Label>
              {(planForm.features ?? [""]).map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={feature} onChange={(event) => updatePlanFeature(index, event.target.value)} />
                  <Button type="button" variant="outline" onClick={() => setPlanForm((prev) => ({ ...prev, features: (prev.features ?? []).filter((_, itemIndex) => itemIndex !== index) }))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setPlanForm((prev) => ({ ...prev, features: [...(prev.features ?? []), ""] }))}>
                <Plus className="h-4 w-4" />
                添加权益
              </Button>
            </div>
            <div className="grid gap-2 text-sm text-foreground">
              {[
                ["highlight", "推荐套餐"],
                ["purchasable", "允许购买"],
                ["active", "上架展示"],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(planForm[field as "highlight" | "purchasable" | "active"])}
                    onChange={(event) => updatePlanField(field as "highlight" | "purchasable" | "active", event.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={startCreatePlan} disabled={plansSaving}>
                重置
              </Button>
              <Button type="button" onClick={() => void handleSavePlan()} disabled={plansSaving}>
                {plansSaving ? "保存中…" : "保存套餐"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveContact = async () => {
    const result = await confirm.prompt({
      title: "确认保存企业联系方式？",
      description:
        "更新后，用户端「联系我们」对话框将使用新数据。此操作会记录审计日志。",
      confirmText: "保存更新",
      cancelText: "取消",
    });

    if (!result.confirmed) {
      return;
    }

    setContactLoading(true);
    try {
      await adminRequestData(
        "/admin/settings/contact",
        {
          method: "PATCH",
          body: JSON.stringify(editForm),
        },
        "更新企业联系方式失败",
      );
      toast.success("企业联系方式更新成功");
      setIsEditingContact(false);
      await refreshContact();
      await refreshOverview();
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      toast.error(getAdminApiErrorMessage(error, "更新企业联系方式失败"));
    } finally {
      setContactLoading(false);
    }
  };

  const updateChannelField = (index: number, field: keyof ContactChannelConfig, value: string | number | null | undefined) => {
    setEditForm((prev) => {
      const channels = [...(prev.contactChannels || [])];
      if (!channels[index]) return prev;

      channels[index] = { ...channels[index], [field]: value } as ContactChannelConfig;

      // Auto-generate maskedHandle if handle changed
      if (field === "handle") {
        const h = String(value || "");
        channels[index].maskedHandle = h.length > 6 
          ? h.slice(0, 3) + "****" + h.slice(-4)
          : h;
      }

      return { ...prev, contactChannels: channels };
    });
  };

  const addChannel = () => {
    setEditForm((prev) => ({
      ...prev,
      contactChannels: [
        ...(prev.contactChannels || []),
        {
          title: "",
          handle: "",
          maskedHandle: "",
          summary: "",
          qrLabel: "",
          qrSeed: 10,
          type: "wechat" as const,
        },
      ],
    }));
  };

  const removeChannel = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      contactChannels: (prev.contactChannels || []).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const computeMaskedHandle = (handle: string = ""): string => {
    if (!handle) return "";
    const h = handle.toString().trim();
    if (h.length <= 6) return h;
    return h.slice(0, 3) + "****" + h.slice(-4);
  };

  const handleQrImageUpload = async (channelIndex: number, file: File) => {
    setContactLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await adminRequestData<{
        qrImageUrl: string;
        storagePath: string;
      }>(
        "/admin/settings/qr-upload",
        {
          method: "POST",
          body: formData,
        },
        "二维码上传失败",
      );

      updateChannelField(channelIndex, "qrImageUrl", result.qrImageUrl);
      toast.success("二维码图片上传成功");
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error));
      toast.error(getAdminApiErrorMessage(error, "二维码上传失败"));
    } finally {
      setContactLoading(false);
    }
  };

  const renderContactTab = () => {
    if (contactLoading && !contactData) {
      return (
        <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          加载中…
        </div>
      );
    }

    if (contactError || !contactData) {
      return (
        <StatePanel
          status="error"
          title="获取联系方式失败"
          description={contactError ?? "请稍后再试。"}
        />
      );
    }

    const canEdit =
      overview?.currentAdmin.roles.includes("super_admin") ?? false;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                企业联系方式管理
              </h2>
              <p className="text-xs text-muted-foreground mt-2">
                编辑后同步至营销页面的「联系我们」对话框
              </p>
            </div>
            {canEdit && (
              <Button
                onClick={() => setIsEditingContact(!isEditingContact)}
                variant={isEditingContact ? "outline" : "default"}
              >
                {isEditingContact ? "取消" : "编辑"}
              </Button>
            )}
          </div>

          {isEditingContact ? (
            <div className="space-y-8">
              {/* Company Basic Info Form */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <span className="text-primary">①</span> 基本企业信息
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>公司名称</Label>
                    <Input
                      value={editForm.companyName || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                      placeholder="上海智酷数能科技有限公司"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>联系邮箱</Label>
                    <Input
                      value={editForm.contactEmail || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          contactEmail: e.target.value,
                        }))
                      }
                      placeholder="server@zicool.cn"
                      type="email"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>联系地址</Label>
                    <Input
                      value={editForm.address || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="上海市崇明区长兴镇潘园公路1800号"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>官方网站</Label>
                    <Input
                      value={editForm.website || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      placeholder="https://www.zicool.cn"
                      type="url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>服务时间</Label>
                    <Input
                      value={editForm.serviceHours || ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          serviceHours: e.target.value,
                        }))
                      }
                      placeholder="工作日 10:00-19:00"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Channels Form */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-primary">②</span> 联系渠道
                    <span className="text-xs text-muted-foreground font-normal">
                      (支持动态增删，运营管理员可直接填写)
                    </span>
                  </h3>
                  <Button
                    type="button"
                    onClick={addChannel}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加渠道
                  </Button>
                </div>

                <div className="space-y-6">
                  {(editForm.contactChannels || []).map((channel, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-border bg-card p-6 relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
                        onClick={() => removeChannel(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>渠道类型</Label>
                          <Select
                            value={channel.type}
                            onValueChange={(value) =>
                              updateChannelField(index, "type", value as "wechat" | "douyin")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="wechat">微信</SelectItem>
                              <SelectItem value="douyin">抖音</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>渠道标题</Label>
                          <Input
                            value={channel.title || ""}
                            onChange={(e) =>
                              updateChannelField(index, "title", e.target.value)
                            }
                            placeholder={
                              channel.type === "wechat"
                                ? "客服微信"
                                : "官方抖音"
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>联系号 / ID</Label>
                          <Input
                            value={channel.handle || ""}
                            onChange={(e) =>
                              updateChannelField(
                                index,
                                "handle",
                                e.target.value,
                              )
                            }
                            placeholder={
                              channel.type === "wechat"
                                ? "18600165902"
                                : "818740482"
                            }
                          />
                        </div>

                        {/* maskedHandle is now auto-computed from handle by backend/frontend - no separate editing */}
                        <div className="space-y-2 opacity-75">
                          <Label className="text-muted-foreground">
                            掩码显示（自动生成）
                          </Label>
                          <Input
                            value={
                              channel.maskedHandle ||
                              computeMaskedHandle(channel.handle || "")
                            }
                            readOnly
                            className="bg-muted/50 cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>摘要说明</Label>
                          <Input
                            value={channel.summary || ""}
                            onChange={(e) =>
                              updateChannelField(
                                index,
                                "summary",
                                e.target.value,
                              )
                            }
                            placeholder="产品/合作/试用咨询"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>扫码提示文案</Label>
                          <Input
                            value={channel.qrLabel || ""}
                            onChange={(e) =>
                              updateChannelField(
                                index,
                                "qrLabel",
                                e.target.value,
                              )
                            }
                            placeholder="微信扫码添加"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>二维码图片</Label>
                          <div className="flex items-center gap-3">
                            {channel.qrImageUrl ? (
                              <div className="relative w-22 h-22 border border-border rounded overflow-hidden bg-white">
                                <Image
                                  src={channel.qrImageUrl!}
                                  alt="QR Preview"
                                  width={88}
                                  height={88}
                                  className="w-full h-full object-contain p-1"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-22 h-22 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center text-xs text-muted-foreground">
                                无图片
                              </div>
                            )}
                            <div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept =
                                    "image/jpeg,image/png,image/webp,image/gif";
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement)
                                      .files?.[0];
                                    if (!file) return;
                                    await handleQrImageUpload(index, file);
                                  };
                                  input.click();
                                }}
                              >
                                上传二维码
                              </Button>
                              <p className="text-xs text-muted-foreground mt-2">
                                支持 JPG/PNG/WebP/GIF，最大 2MB
                                <br />
                                上传后自动填充 URL
                              </p>
                            </div>
                          </div>
                          {channel.qrImageUrl && (
                            <Input
                              value={channel.qrImageUrl}
                              readOnly
                              className="text-[10px] font-mono bg-muted/50 mt-2"
                            />
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                        提示：修改「联系号」会自动生成掩码。QR Seed 用于 MockQr
                        组件生成演示二维码。保存后营销页面立即生效。
                      </div>
                    </div>
                  ))}

                  {(editForm.contactChannels || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-2xl">
                      暂无渠道配置，点击「添加渠道」开始配置
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <Button
                  onClick={handleSaveContact}
                  disabled={contactLoading}
                  className="flex-2"
                >
                  {contactLoading ? "保存中..." : "保存全部变更"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditingContact(false);
                    if (contactData) {
                      setEditForm({
                        companyName: contactData.companyName,
                        address: contactData.address,
                        website: contactData.website,
                        contactEmail: contactData.contactEmail,
                        serviceHours: contactData.serviceHours,
                        contactChannels: [...contactData.contactChannels],
                      });
                    }
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">公司名称</span>
                    <span className="font-medium text-right">
                      {contactData.companyName}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">联系地址</span>
                    <span className="font-medium text-right max-w-[260px]">
                      {contactData.address}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">服务时间</span>
                    <span className="font-medium">
                      {contactData.serviceHours}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">官方网站</span>
                    <a
                      href={contactData.website}
                      target="_blank"
                      className="text-brand hover:underline font-medium"
                    >
                      {contactData.website}
                    </a>
                  </div>
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">联系邮箱</span>
                    <span className="font-medium">
                      {contactData.contactEmail}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    联系渠道
                  </p>
                  <div className="flex-1 h-px bg-border"></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {(contactData.contactChannels || []).map((ch, idx) => {
                    const isWechat = ch.type === "wechat" || !ch.type;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-border bg-muted/40 p-5 flex flex-col"
                      >
                        <div
                          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium mb-3 ${isWechat ? "border-brand/30 bg-brand/5 text-brand" : "border-chart-3/30 bg-chart-3/5 text-chart-3"}`}
                        >
                          {isWechat ? "微信" : "抖音"}
                        </div>
                        <div className="font-semibold text-foreground mb-1">
                          {ch.title}
                        </div>
                        <div className="text-sm text-muted-foreground mb-4">
                          {ch.summary}
                        </div>
                        <div className="mt-auto pt-4 border-t text-sm font-medium text-foreground flex items-center gap-2">
                          <span>{ch.maskedHandle}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {ch.qrLabel}
                        </div>
                        {ch.qrImageUrl && (
                          <div className="mt-3 pt-3 border-t">
                            <Image
                              src={ch.qrImageUrl}
                              alt={ch.qrLabel || "QR Code"}
                              width={88}
                              height={88}
                              className="w-22 h-22 object-contain mx-auto rounded border border-border bg-white p-1"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          此设置由管理后台维护，修改后{" "}
          <code className="text-xs bg-muted px-1 rounded">/api/contact</code>{" "}
          接口和营销联系对话框将自动更新。审计日志会记录每次修改。
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            系统设置
          </h1>
          <p className="text-sm text-muted-foreground">
            管理员治理设置，包括管理员账号、角色权限、订阅套餐、支付配置、联系方式、操作审计和系统信息。
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "accounts" ? renderAccountsTab() : null}
        {activeTab === "roles" ? renderRolesTab() : null}
        {activeTab === "plans" ? renderPlansTab() : null}
        {activeTab === "payment" ? renderPaymentTab() : null}
        {activeTab === "contact" ? renderContactTab() : null}
        {activeTab === "audit" ? renderAuditTab() : null}
        {activeTab === "system" ? renderSystemTab() : null}
      </div>
    </>
  );
}
