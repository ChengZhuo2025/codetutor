"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Code2, Menu, Sparkles, X } from "lucide-react"
import { APP_EVENTS } from "@/constants/events"
import { MARKETING_NAV_ITEMS } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles"
import { useLandingAuthState } from "@/features/marketing/providers/landing-auth-provider"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
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
  const { site } = usePublicSite()
  const { information } = site
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeHref, setActiveHref] = useState(MARKETING_NAV_ITEMS[0]?.href ?? "#home")
  const { authState, maskedPhone } = useLandingAuthState()
  const { trackEvent } = useAppEventTracker()

  useEffect(() => {
    const sectionItems = MARKETING_NAV_ITEMS.filter((item) => item.href !== "#home")
    const sectionEntryMap = new Map<string, IntersectionObserverEntry>()

    function resolveActiveHref() {
      if (window.scrollY < 80) {
        setActiveHref((prev) => (prev === "#home" ? prev : "#home"))
        return
      }

      const visibleEntries = Array.from(sectionEntryMap.values()).filter((entry) => entry.isIntersecting)
      if (visibleEntries.length === 0) {
        return
      }

      const currentSection = visibleEntries
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0]
        .target.id
      const nextHref = `#${currentSection}`
      setActiveHref((prev) => (prev === nextHref ? prev : nextHref))
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          sectionEntryMap.set(entry.target.id, entry)
        }
        resolveActiveHref()
      },
      {
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    )

    for (const item of sectionItems) {
      const el = document.getElementById(item.href.replace("#", ""))
      if (el) {
        observer.observe(el)
      }
    }

    window.addEventListener("scroll", resolveActiveHref, { passive: true })
    resolveActiveHref()

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", resolveActiveHref)
    }
  }, [])

  const desktopActions =
    authState.status === "authenticated" ? (
      <>
        <ThemeToggle />
        <div className="rounded-full border border-brand/20 bg-brand/12 px-3 py-1 text-xs font-medium text-brand dark:border-brand/30 dark:bg-brand/20">
          {maskedPhone}
        </div>
        <Link href={authState.summary.redirectTo}>
          <Button
            size="sm"
            onClick={() =>
              trackEvent(APP_EVENTS.landingCtaClick, {
                source: "marketing_nav_resume",
                target: authState.summary.redirectTo,
              })
            }
            className={USER_BUTTON_PRIMARY_CLASS}
          >
            继续学习
          </Button>
        </Link>
      </>
    ) : authState.status === "guest" ? (
      <>
        <ThemeToggle />
        <div className="rounded-full border border-brand/20 bg-brand/12 px-3 py-1 text-xs font-medium text-brand dark:border-brand/30 dark:bg-brand/20">
          v{information.version} Beta
        </div>
        <Link href={ROUTES.login}>
          <Button variant="outline" size="sm" className={USER_BUTTON_SECONDARY_CLASS}>
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
            className={USER_BUTTON_PRIMARY_CLASS}
          >
            免费开始
          </Button>
        </Link>
      </>
    ) : (
      <>
        <ThemeToggle />
        <div className="h-9 w-[132px]" aria-hidden="true" />
      </>
    )

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl dark:border-white/8 dark:bg-[oklch(0.16_0.01_270/0.5)]">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-6">
        <Link href={ROUTES.home} className="flex items-center gap-3 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand text-brand-foreground shadow-[0_10px_28px_-18px_oklch(0.73_0.21_270/0.72)]">
            {information.logoUrl ? (
              <Image src={information.logoUrl} alt={`${information.siteName} logo`} width={36} height={36} className="h-full w-full object-contain" unoptimized />
            ) : (
              <Code2 className="h-[18px] w-[18px]" />
            )}
          </div>
          <div className="leading-[1.02]">
            <span className="block text-[1rem] font-semibold tracking-tight">{information.siteName}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {information.siteSubtitle}
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
                  ? "bg-surface-3 text-foreground ring-1 ring-border/70 dark:bg-foreground/6 dark:ring-foreground/10"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground dark:hover:bg-foreground/6",
                )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">{desktopActions}</div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="flex items-center justify-center p-1 text-muted-foreground"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="切换菜单"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/80 bg-background/95 px-6 pb-6 pt-4 dark:border-white/8 dark:bg-[oklch(0.16_0.01_270/0.74)] md:hidden">
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
                    ? "bg-surface-3 text-foreground ring-1 ring-border/70 dark:bg-foreground/6 dark:ring-foreground/10"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground dark:hover:bg-foreground/6",
                  )}
              >
                {item.label}
              </button>
            ))}
            <hr className="border-border/50" />
            {authState.status === "authenticated" ? (
              <>
                <div className="rounded-2xl border border-brand/20 bg-brand/10 px-3 py-2 text-sm text-brand">
                  当前账号：{maskedPhone}
                </div>
                <Link href={authState.summary.redirectTo}>
                  <Button
                    className={cn("w-full", USER_BUTTON_PRIMARY_CLASS)}
                    onClick={() =>
                      trackEvent(APP_EVENTS.landingCtaClick, {
                        source: "marketing_nav_mobile_resume",
                        target: authState.summary.redirectTo,
                      })
                    }
                  >
                    继续学习
                  </Button>
                </Link>
              </>
            ) : authState.status === "guest" ? (
              <Link href={ROUTES.login}>
                <Button
                  className={cn("w-full", USER_BUTTON_PRIMARY_CLASS)}
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
            ) : (
              <div className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/4">
                正在恢复登录状态...
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
