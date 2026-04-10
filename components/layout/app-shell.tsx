"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AppMobileNav } from "@/components/layout/app-mobile-nav"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useWorkspaceLayout, type WorkspacePageKey } from "@/providers/workspace-layout-provider"
import { cn } from "@/lib/utils"

type RenderPanel = (options: { mobile: boolean }) => ReactNode

type AppShellProps = {
  workspacePage: WorkspacePageKey
  mobileTitle: string
  mobileSubtitle?: string
  asideLabel?: string
  renderSidebar: RenderPanel
  renderAside?: RenderPanel
  children: ReactNode
  className?: string
  mainClassName?: string
  asideClassName?: string
}

export function AppShell({
  workspacePage,
  mobileTitle,
  mobileSubtitle,
  asideLabel,
  renderSidebar,
  renderAside,
  children,
  className,
  mainClassName,
  asideClassName,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [asideOpen, setAsideOpen] = useState(false)
  const { isRightCollapsed, setRightCollapsed } = useWorkspaceLayout()
  const hasAside = Boolean(renderAside)
  const rightCollapsed = hasAside ? isRightCollapsed(workspacePage) : false

  return (
    <div
      className={cn(
        "min-h-screen h-dvh overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      <div className="flex h-full min-h-0">
        <div className="hidden h-full min-h-0 lg:flex">{renderSidebar({ mobile: false })}</div>

        <div className="relative flex min-h-0 min-w-0 flex-1">
          <div
            className={cn(
              "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              mainClassName,
            )}
          >
            <AppMobileNav
              title={mobileTitle}
              subtitle={mobileSubtitle}
              onOpenSidebar={() => setSidebarOpen(true)}
              onOpenAside={hasAside ? () => setAsideOpen(true) : undefined}
              asideLabel={asideLabel}
            />
            {children}
          </div>

          {renderAside ? (
            <div
              className={cn(
                "relative hidden h-full min-h-0 overflow-visible transition-[width,border-color,background-color] duration-300 xl:flex xl:shrink-0",
                rightCollapsed
                  ? "xl:w-0 xl:border-l-0 xl:border-transparent xl:bg-transparent"
                  : cn("xl:border-l xl:border-border/50 xl:bg-sidebar/55", asideClassName),
              )}
              aria-hidden={rightCollapsed}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => setRightCollapsed(workspacePage, !rightCollapsed)}
                aria-label={
                  rightCollapsed
                    ? asideLabel ?? "展开右侧面板"
                    : asideLabel
                      ? `收起${asideLabel}`
                      : "收起右侧面板"
                }
                title={
                  rightCollapsed
                    ? asideLabel ?? "展开右侧面板"
                    : asideLabel
                      ? `收起${asideLabel}`
                      : "收起右侧面板"
                }
                className={cn(
                  "pointer-events-auto absolute top-1/2 left-0 z-30 hidden -translate-x-1/2 -translate-y-1/2",
                  "border border-border/60 bg-background/85 text-muted-foreground backdrop-blur-sm",
                  "hover:border-border/75 hover:bg-muted/40 hover:text-foreground",
                  "dark:border-border/80 dark:bg-background/70 dark:hover:bg-muted/25",
                  "xl:inline-flex [&_svg]:size-6!",
                )}
              >
                {rightCollapsed ? (
                  <ChevronLeft className="size-6 shrink-0 mr-2" aria-hidden />
                ) : (
                  <ChevronRight className="size-6 shrink-0" aria-hidden />
                )}
              </Button>
              <div
                className={cn(
                  "h-full min-w-0 overflow-hidden transition-opacity duration-200",
                  rightCollapsed
                    ? "pointer-events-none w-0 opacity-0"
                    : "w-full min-w-0 opacity-100",
                )}
              >
                {renderAside({ mobile: false })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[88vw] border-r border-border/60 bg-sidebar p-0 sm:max-w-sm"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{mobileTitle} 导航</SheetTitle>
            <SheetDescription>打开页面导航和个人学习概览。</SheetDescription>
          </SheetHeader>
          <div className="h-full overflow-hidden">{renderSidebar({ mobile: true })}</div>
        </SheetContent>
      </Sheet>

      {renderAside ? (
        <Sheet open={asideOpen} onOpenChange={setAsideOpen}>
          <SheetContent
            side="right"
            className="w-[92vw] border-l border-border/60 bg-sidebar p-0 sm:max-w-md"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{asideLabel ?? mobileTitle}</SheetTitle>
              <SheetDescription>查看当前页面的补充信息与上下文。</SheetDescription>
            </SheetHeader>
            <div className="h-full overflow-hidden">{renderAside({ mobile: true })}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}
