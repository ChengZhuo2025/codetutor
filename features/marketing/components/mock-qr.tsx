import { cn } from "@/lib/utils"

type MockQrProps = {
  seed: number
  label: string
  className?: string
}

function isFilled(seed: number, row: number, col: number) {
  const inFinder =
    (row < 3 && col < 3) ||
    (row < 3 && col > 7) ||
    (row > 7 && col < 3)

  if (inFinder) return true
  if ((row === 0 || row === 2 || row === 8 || row === 10) && (col <= 2 || col >= 8)) {
    return true
  }
  if ((col === 0 || col === 2 || col === 8 || col === 10) && (row <= 2 || row >= 8)) {
    return true
  }

  return ((row * 17 + col * 31 + seed) % 5) < 2
}

export function MockQr({ seed, label, className }: MockQrProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-border bg-muted/60 p-4 dark:border-white/10 dark:bg-black/20",
        className,
      )}
    >
      <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] gap-1 rounded-[20px] bg-white p-3">
        {Array.from({ length: 11 * 11 }, (_, index) => {
          const row = Math.floor(index / 11)
          const col = index % 11

          return (
            <div
              key={`${row}-${col}`}
              className={cn(
                "aspect-square rounded-[2px]",
                isFilled(seed, row, col) ? "bg-slate-950" : "bg-transparent",
              )}
            />
          )
        })}
      </div>
      <p className="mt-3 text-center text-xs font-medium tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
