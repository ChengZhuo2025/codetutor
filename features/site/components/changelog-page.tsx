import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { MarkdownContent } from "@/features/site/components/markdown-content"
import type { PublicSiteChangelogEntry } from "@/lib/api/contracts/admin-site"

type ChangelogPageProps = {
  entries: PublicSiteChangelogEntry[]
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).format(new Date(`${value}T00:00:00Z`))
    : ""
}

export function ChangelogPage({ entries }: ChangelogPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-sm font-medium text-primary">CodeTutor</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">更新日志</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            记录 CodeTutor 面向用户可见的产品改进、体验优化与问题修复。
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-border bg-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{entry.title}</h2>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(entry.logDate)}
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <MarkdownContent content={entry.summaryMarkdown} />
              </div>
            </article>
          ))}

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
              暂无更新日志
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
