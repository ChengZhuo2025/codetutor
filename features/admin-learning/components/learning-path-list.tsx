"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Download,
  Search,
  TimerReset,
  Trophy,
  Users,
} from "lucide-react";
import type { AdminLearningPathListResponseData } from "@/lib/api/contracts/admin-learning";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatePanel } from "@/components/ui/state-panel";
import { ADMIN_ROUTES } from "@/constants/routes";
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer";
import { AdminListTag } from "@/features/admin-shell/components/admin-list-tag";
import { AdminSelect } from "@/features/admin-shell/components/admin-select";
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect";
import {
  adminBffFetch,
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client";
import {
  formatAdminLearningShortDateTime,
  getAdminLearningStatusMeta,
} from "../lib/view-model";

const EMPTY_STATS = {
  totalPaths: 0,
  activeCount: 0,
  interruptedCount: 0,
  completedCount: 0,
  abandonedCount: 0,
};

const statValueToneClass = {
  default: "text-foreground",
  chart2: "text-chart-2",
  chart3: "text-chart-3",
  primary: "text-primary",
} as const;

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  valueTone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  valueTone?: keyof typeof statValueToneClass;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <p>{label}</p>
      </div>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          statValueToneClass[valueTone],
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function LearningPathList() {
  const [data, setData] = useState<AdminLearningPathListResponseData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [toolCode, setToolCode] = useState("all");
  const [learningLevel, setLearningLevel] = useState("all");
  const [updatedWithin, setUpdatedWithin] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [keywordApplied, setKeywordApplied] = useState("");
  const [limit, setLimit] = useState("20");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);

  useAdminSessionExpiryRedirect(authExpired);

  const listItems = data?.items ?? [];
  const stats = data?.stats ?? EMPTY_STATS;
  const toolOptions = data?.toolOptions ?? [];
  const total = data?.total ?? 0;
  const pageSize = Number.parseInt(limit, 10) || 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("updatedWithin", updatedWithin);
      params.set("limit", limit);
      params.set("page", String(page));
      if (toolCode !== "all") {
        params.set("toolCode", toolCode);
      }
      if (learningLevel !== "all") {
        params.set("learningLevel", learningLevel);
      }
      if (keywordApplied) {
        params.set("keyword", keywordApplied);
      }

      const result = await adminRequestData<AdminLearningPathListResponseData>(
        `/admin/learning-paths?${params.toString()}`,
        { method: "GET" },
        "获取学习路径列表失败",
      );
      setData(result);
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError));
      setError(getAdminApiErrorMessage(fetchError, "网络请求失败"));
    } finally {
      setIsLoading(false);
    }
  }, [
    keywordApplied,
    learningLevel,
    limit,
    page,
    status,
    toolCode,
    updatedWithin,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("updatedWithin", updatedWithin);
      if (toolCode !== "all") {
        params.set("toolCode", toolCode);
      }
      if (learningLevel !== "all") {
        params.set("learningLevel", learningLevel);
      }
      if (keywordApplied) {
        params.set("keyword", keywordApplied);
      }

      const response = await adminBffFetch(
        `/admin/learning-paths/export?${params.toString()}`,
        { method: "GET" },
        "导出失败",
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const contentDisposition = response.headers.get("Content-Disposition");
      const match = contentDisposition?.match(/filename="([^"]+)"/);
      link.href = url;
      link.download = match?.[1] ?? `admin-learning-paths-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setAuthExpired(isAdminSessionExpiredError(exportError));
      setError(getAdminApiErrorMessage(exportError, "导出失败"));
    } finally {
      setExporting(false);
    }
  };

  if (error && !data) {
    return (
      <StatePanel
        status="error"
        title="获取数据失败"
        description={error}
        actionLabel="重试"
        onAction={() => void fetchList()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            学习记录
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            聚焦真实用户学习路径，查看进度、中断、完成与归档处理。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? "导出中…" : "导出 CSV"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="总路径数"
          value={stats.totalPaths}
          hint="当前非归档学习路径"
          icon={BookOpen}
        />
        <StatCard
          label="进行中"
          value={stats.activeCount}
          hint="可继续推进的路径"
          icon={Users}
          valueTone="chart2"
        />
        <StatCard
          label="已中断"
          value={stats.interruptedCount}
          hint="优先回访与激活"
          icon={TimerReset}
          valueTone="chart3"
        />
        <StatCard
          label="已完成"
          value={stats.completedCount}
          hint="可评估归档"
          icon={Trophy}
          valueTone="primary"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1 min-w-32 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="关键词：用户昵称 / 邮箱 / 路径名 / 路径代码"
                className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPage(1);
                setKeywordApplied(keyword.trim());
              }}
            >
              搜索
            </Button>
            <AdminSelect
              value={status}
              onValueChange={(next) => {
                setPage(1);
                setStatus(next);
              }}
              options={[
                { value: "all", label: "全部状态" },
                { value: "active", label: "进行中" },
                { value: "interrupted", label: "已中断" },
                { value: "completed", label: "已完成" },
                { value: "abandoned", label: "已放弃" },
              ]}
              triggerClassName="min-w-[7rem]"
            />
            <AdminSelect
              value={toolCode}
              onValueChange={(next) => {
                setPage(1);
                setToolCode(next);
              }}
              options={[
                { value: "all", label: "全部工具" },
                ...toolOptions.map((item) => ({
                  value: item.code,
                  label: item.name,
                })),
              ]}
              triggerClassName="min-w-[7rem]"
            />
            <AdminSelect
              value={learningLevel}
              onValueChange={(next) => {
                setPage(1);
                setLearningLevel(next);
              }}
              options={[
                { value: "all", label: "全部等级" },
                { value: "beginner", label: "零基础" },
                { value: "intermediate", label: "有基础" },
                { value: "advanced", label: "进阶提升" },
              ]}
              triggerClassName="min-w-[7rem]"
            />
            <AdminSelect
              value={updatedWithin}
              onValueChange={(next) => {
                setPage(1);
                setUpdatedWithin(next);
              }}
              options={[
                { value: "all", label: "最近更新时间：全部" },
                { value: "7d", label: "最近 7 天" },
                { value: "30d", label: "最近 30 天" },
                { value: "90d", label: "最近 90 天" },
              ]}
              triggerClassName="min-w-[7rem]"
            />
          </div>
        </div>

        {isLoading && !data ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : listItems.length === 0 ? (
          <div className="p-4">
            <StatePanel
              status="empty"
              title="暂无学习路径"
              description="尝试调整筛选条件或关键词。"
            />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4">
              {listItems.map((item) => {
                const statusMeta = getAdminLearningStatusMeta(item.status);
                return (
                  <div
                    key={item.pathId}
                    className="rounded-2xl border border-border bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <AdminListTag className={statusMeta.className}>
                            {statusMeta.label}
                          </AdminListTag>
                          <AdminListTag>{item.toolName}</AdminListTag>
                          <AdminListTag>{item.learningLevelLabel}</AdminListTag>
                          <AdminListTag>{item.selectionModeLabel}</AdminListTag>
                        </div>
                        <div className="mt-3 flex min-w-0 items-start gap-3">
                          {item.userAvatarUrl ? (
                            <Image
                              src={item.userAvatarUrl}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                              {(item.userNickname ?? "?").slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`${ADMIN_ROUTES.learning}/${item.pathId}`}
                                className="truncate text-base font-semibold text-foreground hover:text-primary"
                              >
                                {item.pathName}
                              </Link>
                              <span className="font-mono text-xs text-muted-foreground">
                                {item.pathCode}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {item.userNickname || "未命名用户"} ·{" "}
                              {item.userEmail || item.userId}
                            </p>
                            <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                              <p>
                                进度 {item.progressPercent}% ·{" "}
                                {item.completedTaskCount}/{item.totalTaskCount}{" "}
                                任务
                              </p>
                              <p>
                                进行中 {item.inProgressTaskCount} · 阻塞{" "}
                                {item.blockedTaskCount}
                              </p>
                              <p>累计 XP {item.xpEarned}</p>
                              <p>
                                最近学习{" "}
                                {formatAdminLearningShortDateTime(
                                  item.lastLearningAt,
                                )}
                              </p>
                            </div>
                            <div className="mt-3 h-2 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary transition-[width]"
                                style={{
                                  width: `${Math.max(0, Math.min(100, item.progressPercent))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                        <div className="text-right text-xs text-muted-foreground">
                          <p>
                            开始于{" "}
                            {formatAdminLearningShortDateTime(item.startedAt)}
                          </p>
                          <p className="mt-1">
                            更新于{" "}
                            {formatAdminLearningShortDateTime(item.updatedAt)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link
                            href={`${ADMIN_ROUTES.learning}/${item.pathId}`}
                          >
                            详情
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <AdminListPaginationFooter
              limit={limit}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
              page={page}
              totalPages={totalPages}
              total={total}
              canPrev={page > 1}
              canNext={page < totalPages}
              isLoading={isLoading}
              onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() =>
                setPage((prev) => Math.min(totalPages, prev + 1))
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
