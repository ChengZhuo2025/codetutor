"use client"

import Link from "next/link"
import { useState } from "react"
import { Code2, Menu, X } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { MARKETING_NAV_ITEMS } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"

function scrollToSection(href: string) {
  const id = href.replace("#", "")
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-surface-1/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href={ROUTES.home} className="flex items-center gap-2.5 text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {MARKETING_NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => scrollToSection(item.href)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href={ROUTES.login}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              登录
            </Button>
          </Link>
          <Link href={ROUTES.login}>
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 font-medium">
              免费开始
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="flex md:hidden items-center justify-center text-muted-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="切换菜单"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-surface-1 px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {MARKETING_NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  scrollToSection(item.href)
                  setMobileOpen(false)
                }}
                className="text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
            <hr className="border-border/50" />
            <Link href={ROUTES.login}>
              <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                免费开始
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
