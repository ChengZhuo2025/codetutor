"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { AppMobileNav } from "@/components/layout/app-mobile-nav"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type RenderPanel = (options: { mobile: boolean }) => ReactNode

type AppShellProps = {
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
  const hasAside = Boolean(renderAside)

  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <div className="flex min-h-screen">
        <div className="hidden lg:flex">{renderSidebar({ mobile: false })}</div>

        <div className={cn("flex min-w-0 flex-1 flex-col", mainClassName)}>
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
              "hidden xl:flex xl:min-h-screen xl:shrink-0 xl:border-l xl:border-border/50 xl:bg-sidebar/55",
              asideClassName,
            )}
          >
            {renderAside({ mobile: false })}
          </div>
        ) : null}
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
