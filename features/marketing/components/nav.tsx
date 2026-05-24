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

const NAV_HEIGHT = 60
const SCROLL_OFFSET = NAV_HEIGHT

function scrollToSection(href: string) {
  if (href === "#home") {
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  const id = href.replace("#", "")
  const el = document.getElementById(id)
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.scrollTo({ top, behavior: "smooth" })
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

  useEffect(() => {
    if (!mobileOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [mobileOpen])

  const desktopActions =
    authState.status === "authenticated" ? (
      <>
        <ThemeToggle />
        <div className="rounded-full border border-brand/20 bg-brand/12 px-3 py-1 text-xs font-medium text-brand dark:border-brand/30 dark:bg-brand/20">
          {maskedPhone}
        </div>
        <Button
          asChild
          size="sm"
          className={USER_BUTTON_PRIMARY_CLASS}
        >
          <Link
            href={authState.summary.redirectTo}
            onClick={() =>
              trackEvent(APP_EVENTS.landingCtaClick, {
                source: "marketing_nav_resume",
                target: authState.summary.redirectTo,
              })
            }
          >
            继续学习
          </Link>
        </Button>
      </>
    ) : (
      <>
        <ThemeToggle />
        <div className="rounded-full border border-brand/20 bg-brand/12 px-3 py-1 text-xs font-medium text-brand dark:border-brand/30 dark:bg-brand/20">
          v{information.version} Beta
        </div>
        <Button asChild variant="outline" size="sm" className={USER_BUTTON_SECONDARY_CLASS}>
          <Link href={ROUTES.login}>
            登录
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          className={USER_BUTTON_PRIMARY_CLASS}
        >
          <Link
            href={ROUTES.login}
            onClick={() =>
              trackEvent(APP_EVENTS.landingCtaClick, {
                source: "marketing_nav",
                target: ROUTES.login,
              })
            }
          >
            免费开始
          </Link>
        </Button>
      </>
    )

  return (
    <>
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
              className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground dark:hover:bg-white/8"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="切换菜单"
              aria-expanded={mobileOpen}
              aria-controls="landing-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          id="landing-mobile-menu"
          className="fixed inset-x-0 bottom-0 top-[68px] z-40 overflow-y-auto border-t border-border/80 bg-background/98 px-6 pb-8 pt-5 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/8 dark:bg-[oklch(0.12_0.006_270/0.98)] md:hidden"
        >
          <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-xl flex-col">
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
              <Sparkles className="h-4 w-4 shrink-0" />
              当前可直接体验登录、引导和学习流程 Demo
            </div>

            <nav className="flex flex-1 flex-col gap-2" aria-label="移动端首页导航">
              {MARKETING_NAV_ITEMS.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    setActiveHref(item.href)
                    scrollToSection(item.href)
                    setMobileOpen(false)
                  }}
                  className={cn(
                    "flex min-h-12 items-center rounded-2xl px-4 text-left text-base transition-all",
                    activeHref === item.href
                      ? "bg-surface-3 text-foreground ring-1 ring-border/70 dark:bg-foreground/8 dark:ring-foreground/10"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground dark:hover:bg-foreground/6",
                  )}
                >
                  {item.label}
                </button>
              ))}
              <hr className="my-4 border-border/50 dark:border-white/10" />
              {authState.status === "authenticated" ? (
                <>
                  <div className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
                    当前账号：{maskedPhone}
                  </div>
                  <Button
                    asChild
                    className={cn("mt-3 h-12 w-full text-base", USER_BUTTON_PRIMARY_CLASS)}
                  >
                    <Link
                      href={authState.summary.redirectTo}
                      onClick={() =>
                        trackEvent(APP_EVENTS.landingCtaClick, {
                          source: "marketing_nav_mobile_resume",
                          target: authState.summary.redirectTo,
                        })
                      }
                    >
                      继续学习
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  className={cn("mt-3 h-12 w-full text-base", USER_BUTTON_PRIMARY_CLASS)}
                >
                  <Link
                    href={ROUTES.login}
                    onClick={() =>
                      trackEvent(APP_EVENTS.landingCtaClick, {
                        source: "marketing_nav_mobile",
                        target: ROUTES.login,
                      })
                    }
                  >
                    免费开始第一课
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
