"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { marketingTestimonials } from "@/features/marketing/data/marketing-content"
import { cn } from "@/lib/utils"

const AUTOPLAY_MS = 3500
const RESUME_DELAY_MS = 2000

export function LandingTestimonials() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = marketingTestimonials.length

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      const container = scrollRef.current
      if (!container) return
      const card = container.children[index] as HTMLElement | undefined
      if (!card) return
      const cRect = container.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      const cardLeft =
        cardRect.left - cRect.left + container.scrollLeft
      const offset =
        cardLeft - (cRect.width - cardRect.width) / 2
      container.scrollTo({
        left: Math.max(0, offset),
        behavior: smooth ? "smooth" : "auto",
      })
    },
    [],
  )

  /* ---- auto-play ---- */
  useEffect(() => {
    if (paused || total <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % total
        scrollToIndex(next)
        return next
      })
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [paused, total, scrollToIndex])

  /* ---- sync current index from manual scroll ---- */
  useEffect(() => {
    const container = scrollRef.current
    if (!container || total <= 1) return

    let raf = 0
    const handleScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const cRect = container.getBoundingClientRect()
        const cards = Array.from(container.children) as HTMLElement[]
        const viewCenter = container.scrollLeft + cRect.width / 2
        let closest = 0
        let minDist = Infinity
        cards.forEach((card, i) => {
          const cardRect = card.getBoundingClientRect()
          const cardCenter =
            cardRect.left - cRect.left + container.scrollLeft + cardRect.width / 2
          const dist = Math.abs(cardCenter - viewCenter)
          if (dist < minDist) {
            minDist = dist
            closest = i
          }
        })
        setCurrent((prev) => (prev === closest ? prev : closest))
      })
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", handleScroll)
      cancelAnimationFrame(raf)
    }
  }, [total])

  /* ---- pause on hover / touch with delayed resume ---- */
  const handleInteractionStart = () => {
    setPaused(true)
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }

  const handleInteractionEnd = () => {
    resumeTimerRef.current = setTimeout(() => setPaused(false), RESUME_DELAY_MS)
  }

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [])

  const goNext = () => {
    const next = (current + 1) % total
    setCurrent(next)
    scrollToIndex(next)
  }

  const goPrev = () => {
    const prev = (current - 1 + total) % total
    setCurrent(prev)
    scrollToIndex(prev)
  }

  if (total === 0) return null

  return (
    <div
      className="mt-14"
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
    >
      {/* carousel */}
      <div className="group/carousel relative">
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-8"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {marketingTestimonials.map((t, i) => (
            <div
              key={i}
              className="w-[min(370px,74vw)] shrink-0 rounded-[26px] border border-border/70 bg-card/82 p-7 backdrop-blur transition-all shadow-[0_12px_44px_-22px_rgba(15,23,42,0.15)] hover:shadow-[0_14px_44px_-22px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-surface-2/76 dark:hover:shadow-[0_18px_48px_-24px_rgba(0,0,0,0.55)]"
              style={{ scrollSnapAlign: "center" }}
            >
              {/* 人群标签 */}
              <span className="inline-block rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                {t.audience}
              </span>

              {/* 核心数据 — 单行 */}
              <p className="mt-5 text-2xl font-bold leading-tight text-foreground">
                {t.metric}
              </p>

              {/* 引语 — 3 行以内 */}
              <blockquote className="mt-4 border-l-2 border-brand/30 pl-4 text-sm leading-7 text-muted-foreground">
                {t.quote}
              </blockquote>

              {/* 署名 */}
              <div className="mt-5 flex items-center gap-3 border-t border-border/70 pt-4 dark:border-white/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-sm font-semibold text-brand">
                  {t.name.slice(0, 1)}
                </div>
                <div className="min-w-0 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="mx-1.5 text-border">·</span>
                  {t.role}
                  <span className="mx-1.5 text-border">·</span>
                  {t.duration}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* arrow buttons */}
        <button
          onClick={goPrev}
          className={cn(
            "absolute left-[-46px] top-[160px] -translate-y-1/2 -translate-x-1 rounded-full border border-border/70 bg-card/90 p-2 shadow-md backdrop-blur transition-all hover:bg-card hover:shadow-lg",
            "opacity-0 group-hover/carousel:opacity-100",
            "hidden sm:flex items-center justify-center",
            "dark:border-white/10 dark:bg-surface-2/90 dark:hover:bg-surface-2",
          )}
          aria-label="上一张"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={goNext}
          className={cn(
            "absolute right-[-46px] top-[160px] -translate-y-1/2 translate-x-1 rounded-full border border-border/70 bg-card/90 p-2 shadow-md backdrop-blur transition-all hover:bg-card hover:shadow-lg",
            "opacity-0 group-hover/carousel:opacity-100",
            "hidden sm:flex items-center justify-center",
            "dark:border-white/10 dark:bg-surface-2/90 dark:hover:bg-surface-2",
          )}
          aria-label="下一张"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* dot indicators */}
      <div className="flex items-center justify-center gap-2">
        {marketingTestimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrent(i)
              scrollToIndex(i)
            }}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === current
                ? "w-6 bg-brand"
                : "w-2 bg-border hover:bg-muted-foreground/40 dark:bg-white/15 dark:hover:bg-white/30",
            )}
            aria-label={`第 ${i + 1} 张证言`}
          />
        ))}
      </div>
    </div>
  )
}
