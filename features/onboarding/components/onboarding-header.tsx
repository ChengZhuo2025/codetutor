import { Code2 } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { cn } from "@/lib/utils"

type OnboardingHeaderProps = {
  step: 1 | 2
}

export function OnboardingHeader({ step }: OnboardingHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border/50 bg-surface-1/80 px-6 py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">{APP_NAME}</span>
      </div>
      <div className="flex items-center gap-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              item === step
                ? "w-6 bg-brand"
                : item < step
                  ? "w-2 bg-brand/50"
                  : "w-2 bg-surface-4",
            )}
          />
        ))}
      </div>
      <div className="w-24" />
    </header>
  )
}
