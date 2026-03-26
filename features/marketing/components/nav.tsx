"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Code2, Menu, Sparkles, X } from "lucide-react"
import { APP_EVENTS } from "@/constants/events"
import { APP_NAME } from "@/constants/app"
import { MARKETING_NAV_ITEMS } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAppEventTracker } from "@/providers/app-providers"

function scrollToSection(href: string) {
  if (href === "#home") {
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  const id = href.replace("#", "")
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeHref, setActiveHref] = useState(MARKETING_NAV_ITEMS[0]?.href ?? "#home")
  const { trackEvent } = useAppEventTracker()

  useEffect(() => {
    function updateActiveSection() {
      const scrollPosition = window.scrollY + 140
      let currentHref = MARKETING_NAV_ITEMS[0]?.href ?? "#home"

      for (const item of MARKETING_NAV_ITEMS) {
        if (item.href === "#home") continue

        const el = document.getElementById(item.href.replace("#", ""))
        if (el && scrollPosition >= el.offsetTop) {
          currentHref = item.href
        }
      }

      setActiveHref(currentHref)
    }

    updateActiveSection()
    window.addEventListener("scroll", updateActiveSection, { passive: true })
    window.addEventListener("resize", updateActiveSection)

    return () => {
      window.removeEventListener("scroll", updateActiveSection)
      window.removeEventListener("resize", updateActiveSection)
    }
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[oklch(0.16_0.01_240/0.5)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-6">
        <Link href={ROUTES.home} className="flex items-center gap-3 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_10px_28px_-18px_oklch(0.78_0.15_180/0.72)]">
            <Code2 className="h-[18px] w-[18px]" />
          </div>
          <div className="leading-[1.02]">
            <span className="block text-[1.06rem] font-extrabold tracking-tight">{APP_NAME}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              AI 编程学习教练
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          {MARKETING_NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => {
                setActiveHref(item.href)
                scrollToSection(item.href)
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-all",
                activeHref === item.href
                  ? "bg-white/6 text-foreground"
                  : "text-muted-foreground hover:bg-white/6 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            v0.1.0 Beta
          </div>
          <Link href={ROUTES.login}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              登录
            </Button>
          </Link>
          <Link href={ROUTES.login}>
            <Button
              size="sm"
              onClick={() =>
                trackEvent(APP_EVENTS.landingCtaClick, {
                  source: "marketing_nav",
                  target: ROUTES.login,
                })
              }
              className="bg-brand text-brand-foreground shadow-[0_18px_40px_-20px_oklch(0.78_0.15_180/0.9)] hover:bg-brand/90"
            >
              免费开始
            </Button>
          </Link>
        </div>

        <button
          className="flex items-center justify-center text-muted-foreground md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="切换菜单"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/8 bg-[oklch(0.16_0.01_240/0.74)] px-6 pb-6 pt-4 md:hidden">
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-brand/20 bg-brand/10 px-3 py-2 text-sm text-brand">
            <Sparkles className="h-4 w-4" />
            当前可直接体验登录、引导和学习流程 Demo
          </div>

          <nav className="flex flex-col gap-4">
            {MARKETING_NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  setActiveHref(item.href)
                  scrollToSection(item.href)
                  setMobileOpen(false)
                }}
                className={cn(
                  "rounded-xl px-2 py-1 text-left text-sm transition-all",
                  activeHref === item.href
                    ? "bg-white/6 text-foreground"
                    : "text-muted-foreground hover:bg-white/6 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
            <hr className="border-border/50" />
            <Link href={ROUTES.login}>
              <Button
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() =>
                  trackEvent(APP_EVENTS.landingCtaClick, {
                    source: "marketing_nav_mobile",
                    target: ROUTES.login,
                  })
                }
              >
                免费开始
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
