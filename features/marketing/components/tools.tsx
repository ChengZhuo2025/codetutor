"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  marketingAudiences,
  marketingTools,
} from "@/features/marketing/data/marketing-content";
import { cn } from "@/lib/utils";

const MOBILE_PRIMARY_TOOL_COUNT = 5;

export function LandingTools() {
  const [activeTool, setActiveTool] = useState(
    marketingTools[1]?.name ?? marketingTools[0]?.name,
  );
  const selectedTool = useMemo(
    () =>
      marketingTools.find((tool) => tool.name === activeTool) ??
      marketingTools[0],
    [activeTool],
  );
  const mobilePrimaryTools = marketingTools.slice(0, MOBILE_PRIMARY_TOOL_COUNT);
  const mobileSecondaryTools = marketingTools.slice(MOBILE_PRIMARY_TOOL_COUNT);

  return (
    <section id="tools" className="relative px-5 py-14 scroll-mt-20 sm:px-6 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent dark:via-white/16" />
      <div className="mx-auto max-w-6xl relative z-10 ">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex h-full flex-col">
            <div>
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
                支持工具
              </p>
              <h2 className="mb-4 text-3xl leading-[1.25] font-bold tracking-tight text-balance lg:leading-[1.3]">
                选择一个工具
                <br />
                <span className="text-brand">开始进入</span>对应第一课
              </h2>
              <p className="mb-6 max-w-xl text-sm leading-7 text-muted-foreground lg:mb-8">
                先从你真正要用的工具开始学。不同工具不会套同一份课程，而是给出不同的起步任务、提示方式和产出标准。
              </p>

              <div className="hidden flex-wrap gap-3 md:flex">
                {marketingTools.map((tool) => (
                  <button
                    key={tool.name}
                    type="button"
                    aria-pressed={activeTool === tool.name}
                    onClick={() => setActiveTool(tool.name)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all shadow-[0_10px_20px_-10px_rgba(15,25,45,0.15)]",
                      activeTool === tool.name
                        ? "border-brand/40 bg-brand text-white shadow-[0_18px_44px_-30px_rgba(80,70,220,0.5)]"
                        : "border-border/70 bg-card/80 text-muted-foreground hover:border-brand/24 hover:bg-brand/5 hover:text-foreground dark:border-white/10 dark:bg-surface-2/75",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        activeTool === tool.name ? "bg-white" : tool.dot,
                      )}
                    />
                    {tool.name}
                  </button>
                ))}
              </div>
              <div className="md:hidden space-y-3">
                <div className="flex flex-wrap gap-2.5">
                  {mobilePrimaryTools.map((tool) => (
                    <button
                      key={tool.name}
                      type="button"
                      aria-pressed={activeTool === tool.name}
                      onClick={() => setActiveTool(tool.name)}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all shadow-[0_10px_20px_-10px_rgba(15,25,45,0.15)]",
                        activeTool === tool.name
                          ? "border-brand/40 bg-brand text-white shadow-[0_18px_44px_-30px_rgba(80,70,220,0.5)]"
                          : "border-border/70 bg-card/80 text-muted-foreground hover:border-brand/24 hover:bg-brand/5 hover:text-foreground dark:border-white/10 dark:bg-surface-2/75",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          activeTool === tool.name ? "bg-white" : tool.dot,
                        )}
                      />
                      {tool.name}
                    </button>
                  ))}
                </div>
                <details className="group rounded-2xl border border-border/70 bg-card/70 px-4 py-3 dark:border-white/10 dark:bg-surface-2/70">
                  <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground transition-colors group-open:text-foreground">
                    更多工具
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {mobileSecondaryTools.map((tool) => (
                      <button
                        key={tool.name}
                        type="button"
                        aria-pressed={activeTool === tool.name}
                        onClick={() => setActiveTool(tool.name)}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                          activeTool === tool.name
                            ? "border-brand/40 bg-brand text-white"
                            : "border-border/70 bg-background/70 text-muted-foreground hover:border-brand/24 hover:bg-brand/5 hover:text-foreground dark:border-white/10 dark:bg-white/4",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            activeTool === tool.name ? "bg-white" : tool.dot,
                          )}
                        />
                        {tool.name}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            <div className="mt-auto hidden pt-8 md:block">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                下载工具
              </p>
              <div className="flex flex-wrap gap-2">
                {marketingTools
                  .filter((t) => t.downloadUrl)
                  .map((tool) => (
                    <a
                      key={tool.name}
                      href={tool.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand dark:bg-surface-2/75 dark:hover:bg-brand/20"
                    >
                      {tool.name}
                    </a>
                  ))}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-card p-5 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.32)] dark:border-white/10 dark:bg-surface-2/70 lg:rounded-[28px] lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedTool?.tag}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-foreground lg:text-2xl">
                  {selectedTool?.name} 起步路径
                </h3>
              </div>
              <span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                动手第一课
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-6">
              {[
                ["学习目标", selectedTool?.exampleGoal],
                ["第一步任务", selectedTool?.firstTask],
                ["完成产出", selectedTool?.outcome],
                ["适合人群", selectedTool?.fit],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={cn(
                    "rounded-2xl border px-4 py-3",
                    index === 1
                      ? "border-brand/24 bg-brand/10"
                      : "border-border/70 bg-surface-1 dark:border-white/8 dark:bg-white/4",
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-sm leading-7 line-clamp-1 text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-border/70 pt-5 dark:border-white/10 lg:mt-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                也适合这些学习入口
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {marketingAudiences.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-surface-2/70 px-4 py-3 dark:dark:bg-white/4 transition-all hover:-translate-y-1 hover:bg-brand/8 dark:hover:bg-brand/10"
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-brand">
              选定工具后，登录引导会从对应任务开始
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
