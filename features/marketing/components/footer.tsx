import Link from "next/link"
import { ArrowRight, Code2 } from "lucide-react"
import { APP_COPYRIGHT_YEAR, APP_NAME } from "@/constants/app"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"

export function LandingFooter() {
  return (
    <>
      {/* Final CTA section */}
      <section className="py-24 px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-balance">
            今天就开始你的第一步
          </h2>
          <p className="mb-8 text-lg text-muted-foreground text-pretty">
            不需要任何编程基础。粘贴一个教程链接，AI 导师帮你拆解第一步。
          </p>
          <Link href={ROUTES.login}>
            <Button
              size="lg"
              className="h-12 bg-brand px-8 text-base font-semibold text-brand-foreground hover:bg-brand/90"
            >
              免费开始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-surface-2 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Code2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">{APP_NAME}</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground transition-colors">关于</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">隐私政策</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">使用条款</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {APP_COPYRIGHT_YEAR} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  )
}
