export const FLOATING_PANEL_CLASS =
  "border border-border bg-surface-2 text-foreground shadow-[0_20px_60px_-32px_rgba(15,23,42,0.24)] ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-[oklch(0.2_0.015_270/0.98)] dark:ring-white/10 dark:shadow-[0_32px_80px_-36px_rgba(0,0,0,0.9)]"

export const FLOATING_LIGHT_PANEL_CLASS =
  "border border-border/80 bg-popover shadow-lg shadow-black/10"

export const DIALOG_PANEL_CLASS =
  "border border-border/70 bg-surface-1 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-card dark:shadow-[0_32px_80px_-40px_rgba(0,0,0,0.55)]"

export const DIALOG_GRADIENT_PANEL_CLASS =
  "border border-border/70 bg-surface-1 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-card dark:shadow-[0_32px_80px_-40px_rgba(0,0,0,0.55)]"

export const DIALOG_DARK_GRADIENT_PANEL_CLASS = DIALOG_GRADIENT_PANEL_CLASS

export const USER_PANEL_SECTION_CLASS =
  "rounded-xl border border-border/70 bg-surface-1/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-background/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"

export const USER_PANEL_SUBTLE_SECTION_CLASS =
  "rounded-xl border border-border/60 bg-muted/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"

export const USER_PANEL_FIELD_CLASS =
  "border-border/80 bg-surface-1/95 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"

const USER_BUTTON_DISABLED_CLASS =
  "disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[oklch(0.85_0.01_270)] disabled:text-white/85 disabled:[&_svg]:text-white/85 disabled:shadow-none disabled:saturate-0 disabled:opacity-100 dark:disabled:bg-[oklch(0.42_0.28_270)] dark:disabled:text-white/50 dark:disabled:[&_svg]:text-white/50"

export const USER_BUTTON_PRIMARY_CLASS =
  `!rounded-full border border-transparent bg-brand text-white shadow-[0_20px_54px_-28px_rgba(98,92,255,0.42)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.66_0.24_270)] active:translate-y-0 focus-visible:ring-brand/35 dark:bg-brand dark:text-white dark:shadow-[0_24px_60px_-30px_rgba(116,102,255,0.28)] dark:hover:bg-[oklch(0.78_0.28_270)] dark:[&_svg]:text-white [&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_BUTTON_SECONDARY_CLASS =
  `!rounded-full border border-transparent bg-[oklch(0.70_0.30_230)] text-white shadow-[0_16px_42px_-32px_rgba(88,70,170,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.75_0.30_230)] active:translate-y-0 focus-visible:ring-brand/30 [&_svg]:text-current dark:border-transparent dark:bg-[oklch(0.40_0.024_270)] dark:text-white dark:shadow-[0_20px_48px_-32px_rgba(0,0,0,0.42)] dark:hover:bg-[oklch(0.45_0.024_270)] dark:[&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_BUTTON_DANGER_CLASS =
  `!rounded-full border border-transparent bg-[oklch(0.52_0.19_26)] text-white shadow-[0_18px_48px_-28px_rgba(220,38,38,0.36)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.56_0.2_26)] active:translate-y-0 focus-visible:ring-destructive/30 dark:bg-[oklch(0.48_0.17_26)] dark:text-white dark:shadow-[0_22px_52px_-30px_rgba(127,29,29,0.5)] dark:hover:bg-[oklch(0.52_0.18_26)] [&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_ICON_BUTTON_CLASS =
`!rounded-full border border-transparent bg-[oklch(0.70_0.30_230)] text-white shadow-[0_16px_42px_-32px_rgba(88,70,170,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.75_0.30_230)] active:translate-y-0 focus-visible:ring-brand/30 [&_svg]:text-current dark:border-transparent dark:bg-[oklch(0.40_0.024_270)] dark:text-white dark:shadow-[0_20px_48px_-32px_rgba(0,0,0,0.42)] dark:hover:bg-[oklch(0.45_0.024_270)] dark:[&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_PANEL_OUTLINE_BUTTON_CLASS = USER_BUTTON_SECONDARY_CLASS

export const USER_PANEL_DIVIDER_CLASS =
  "border-border/70 dark:border-white/10"

export const USER_PANEL_HERO_CARD_CLASS =
  "border border-brand/20 bg-[linear-gradient(135deg,oklch(0.996_0.004_270/0.98),oklch(0.982_0.012_285/0.96)_48%,oklch(0.974_0.018_82/0.94))] shadow-[0_26px_70px_-36px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.025] dark:border-white/10 dark:bg-[linear-gradient(145deg,oklch(0.205_0.014_282/0.98),oklch(0.175_0.018_292/0.98)_52%,oklch(0.16_0.014_58/0.98))] dark:shadow-[0_30px_90px_-42px_oklch(0.68_0.22_270/0.28)] dark:ring-white/8"

export const USER_PANEL_HERO_TOP_SECTION_CLASS =
  "border-b border-brand/12 bg-[radial-gradient(circle_at_86%_0%,oklch(0.66_0.24_270/0.14),transparent_48%),radial-gradient(circle_at_0%_4%,oklch(0.78_0.15_230/0.13),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0.04))] dark:border-white/10 dark:bg-[radial-gradient(circle_at_84%_0%,oklch(0.72_0.22_270/0.20),transparent_46%),radial-gradient(circle_at_0%_6%,oklch(0.76_0.14_230/0.13),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01))]"

export const FLOATING_DARK_PANEL_CLASS = FLOATING_PANEL_CLASS
