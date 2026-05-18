"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  Code2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { ADMIN_ROUTES, ROUTES } from "@/constants/routes"
import { usePublicSite } from "@/features/site/providers/public-site-provider"

export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { site } = usePublicSite()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError("请输入邮箱和密码")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()

      if (result.code !== "OK") {
        setError(result.message || "登录失败")
        return
      }

      const nextPath = searchParams.get("next")
      const safeNextPath = nextPath
        && nextPath.startsWith("/")
        && !nextPath.startsWith("//")
        && nextPath !== ADMIN_ROUTES.login
        ? nextPath
        : ADMIN_ROUTES.home
      router.replace(safeNextPath)
      router.refresh()
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || "登录失败")
      } else {
        setError("网络请求失败")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.55 0.018 240 / 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.55 0.018 240 / 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.08_240/0.12),transparent_30%),radial-gradient(circle_at_top_right,oklch(0.62_0.12_210/0.14),transparent_28%),radial-gradient(circle_at_bottom_left,oklch(0.73_0.21_261/0.12),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,oklch(0.28_0.03_240/0.72),transparent_32%),radial-gradient(circle_at_top_right,oklch(0.72_0.13_210/0.14),transparent_28%),radial-gradient(circle_at_bottom_left,oklch(0.74_0.20_261/0.14),transparent_30%)]" />

      <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <Link
          href={ROUTES.home}
          className="group inline-flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand text-brand-foreground shadow-[0_10px_28px_-18px_oklch(0.73_0.21_261/0.72)]">
            {site.information.logoUrl ? (
              <Image
                src={site.information.logoUrl}
                alt={`${site.information.siteName} logo`}
                width={36}
                height={36}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <Code2 className="h-[18px] w-[18px]" />
            )}
          </div>
          <div className="leading-[1.02]">
            <span className="block text-[1rem] font-semibold tracking-tight text-foreground">
              {site.information.siteName}
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {site.information.siteSubtitle}
            </span>
          </div>
        </Link>

        <ThemeToggle className="rounded-full border border-border/70 bg-card/90 shadow-sm backdrop-blur-xl" />
      </header>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="relative flex w-full flex-col justify-center overflow-hidden px-6 pb-8 pt-12 sm:px-8 lg:min-h-screen lg:w-[54%] lg:px-9 lg:pb-8 lg:pt-14 xl:px-12">
          <div className="max-w-2xl pl-20">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:border-primary/35 dark:bg-primary/18">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              管理后台登录入口
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground/90">
                Admin control center
              </p>
              <h1 className="mt-2 text-[2.6rem] font-bold tracking-tight text-foreground leading-[1.02] lg:text-[2.9rem] xl:text-[3.15rem]">
                {site.information.siteName} Admin
              </h1>
              <p className="mt-2 text-md leading-6 text-muted-foreground sm:text-[15px]">
                面向管理员与 IT 运营人员的统一入口，用于处理用户、学习路径、AI 配置与系统治理。
              </p>
            </div>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-card px-3.5 py-3 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                <p className="text-md font-semibold text-foreground">用户</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">用户管理与支持处理</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card px-3.5 py-3 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                <p className="text-md font-semibold text-foreground">学习</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">学习路径与内容运营</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card px-3.5 py-3 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                <p className="text-md font-semibold text-foreground">AI / 系统</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">模型配置与系统治理</p>
              </div>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand/30 px-3 py-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />
              登录后将进入后台首页
            </div>
          </div>
        </section>

        <section className="relative flex w-full items-center justify-center px-6 pb-10 pt-3 sm:px-8 lg:min-h-screen lg:w-[46%] lg:px-9 lg:pb-8 lg:pt-20">
          <div className="w-full max-w-sm lg:max-w-md">
            <div className="rounded-[30px] border border-border/70 bg-card/88 p-5 shadow-[0_30px_100px_-44px_rgba(15,23,42,0.4)] backdrop-blur-2xl sm:p-6 lg:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_20px_48px_-24px_rgba(98,92,255,0.46)]">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Secure admin sign in
                  </p>
                  <h2 className="text-[1.5rem] font-bold text-foreground">欢迎登录管理后台</h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    邮箱
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      disabled={isLoading}
                      className="h-11 rounded-2xl border-border/75 bg-background/82 pl-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    密码
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      disabled={isLoading}
                      className="h-11 rounded-2xl border-border/75 bg-background/82 pl-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive">
                    <StatePanel
                      status="error"
                      title="登录失败"
                      description={error}
                      compact
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full font-medium shadow-lg shadow-primary/25 transition-all duration-200"
                >
                  {isLoading ? "登录中..." : "登录后台"}
                </Button>
              </form>

              <div className="mt-4 rounded-[22px] border border-border/70 bg-background/72 px-4 py-2.5 text-sm text-muted-foreground">
                仅限具备后台权限的管理员账户访问
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3.5">
                <Link
                  href={ROUTES.home}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  智酷数能科技有限公司
                </Link>
                <span className="text-xs text-muted-foreground">Chrome / Edge</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
