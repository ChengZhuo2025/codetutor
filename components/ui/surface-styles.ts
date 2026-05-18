export const DIALOG_PANEL_CLASS =
  "border border-border bg-popover p-0 text-foreground shadow-[0_28px_80px_-40px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-[oklch(0.2_0.015_250/0.98)] dark:ring-white/10 dark:shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)]"

export const DIALOG_GRADIENT_PANEL_CLASS =
  "border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,250,0.96))] p-0 text-foreground shadow-[0_28px_80px_-40px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,oklch(0.22_0.02_235/0.98),oklch(0.17_0.015_250/0.98))] dark:ring-white/10 dark:shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)]"

export const FLOATING_PANEL_CLASS =
  "border border-border bg-popover text-foreground shadow-[0_20px_60px_-32px_rgba(15,23,42,0.24)] ring-1 ring-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-[oklch(0.2_0.015_250/0.98)] dark:ring-white/10 dark:shadow-[0_32px_80px_-36px_rgba(0,0,0,0.9)]"

export const FLOATING_LIGHT_PANEL_CLASS =
  "border border-border/80 bg-popover shadow-lg shadow-black/10"

export const USER_PANEL_SECTION_CLASS =
  "rounded-xl border border-border/70 bg-surface-1/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-background/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"

export const USER_PANEL_SUBTLE_SECTION_CLASS =
  "rounded-xl border border-border/60 bg-muted/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"

export const USER_PANEL_FIELD_CLASS =
  "border-border/80 bg-surface-1/95 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"

const USER_BUTTON_DISABLED_CLASS =
  "disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[oklch(0.72_0.01_240)] disabled:text-white/78 disabled:[&_svg]:text-white/78 disabled:shadow-none disabled:saturate-0 disabled:opacity-100 dark:disabled:bg-[oklch(0.30_0.01_240)]"

export const USER_BUTTON_PRIMARY_CLASS =
  `!rounded-full border border-transparent bg-brand text-white shadow-[0_20px_54px_-28px_rgba(98,92,255,0.42)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.66_0.24_270)] active:translate-y-0 focus-visible:ring-brand/35 dark:bg-brand dark:text-white dark:shadow-[0_24px_60px_-30px_rgba(116,102,255,0.28)] dark:hover:bg-[oklch(0.78_0.28_270)] dark:[&_svg]:text-white [&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_BUTTON_SECONDARY_CLASS =
  `!rounded-full border border-transparent bg-[oklch(0.75_0.15_240)] text-white shadow-[0_16px_42px_-32px_rgba(88,70,170,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.80_0.15_240)] active:translate-y-0 focus-visible:ring-brand/30 [&_svg]:text-current dark:border-transparent dark:bg-[oklch(0.31_0.022_225)] dark:text-white dark:shadow-[0_20px_48px_-32px_rgba(0,0,0,0.42)] dark:hover:bg-[oklch(0.35_0.024_225)] dark:[&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_BUTTON_DANGER_CLASS =
  `!rounded-full border border-transparent bg-[oklch(0.52_0.19_26)] text-white shadow-[0_18px_48px_-28px_rgba(220,38,38,0.36)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.56_0.2_26)] active:translate-y-0 focus-visible:ring-destructive/30 dark:bg-[oklch(0.48_0.17_26)] dark:text-white dark:shadow-[0_22px_52px_-30px_rgba(127,29,29,0.5)] dark:hover:bg-[oklch(0.52_0.18_26)] [&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_ICON_BUTTON_CLASS =
  `!rounded-full border border-transparent bg-[oklch(0.75_0.15_240)] text-white shadow-[0_14px_34px_-28px_rgba(88,70,170,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.80_0.15_240)] active:translate-y-0 focus-visible:ring-brand/30 [&_svg]:text-current dark:border-transparent dark:bg-[oklch(0.31_0.022_225)] dark:text-white dark:hover:bg-[oklch(0.35_0.024_225)] dark:[&_svg]:text-white ${USER_BUTTON_DISABLED_CLASS}`

export const USER_PANEL_OUTLINE_BUTTON_CLASS = USER_BUTTON_SECONDARY_CLASS

export const USER_PANEL_DIVIDER_CLASS =
  "border-border/70 dark:border-white/10"

export const USER_PANEL_HERO_CARD_CLASS =
  "border border-brand/25 bg-surface-1/97 shadow-[0_26px_70px_-36px_rgba(15,23,42,0.2)] dark:border-brand/20 dark:bg-[linear-gradient(135deg,rgba(18,30,34,0.96),rgba(12,22,26,0.96))] dark:shadow-[0_30px_90px_rgba(0,0,0,0.22)]"

export const USER_PANEL_HERO_TOP_SECTION_CLASS =
  "border-b border-brand/15 bg-[radial-gradient(circle_at_top_right,oklch(0.66_0.24_270/0.10),transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02))] dark:border-brand/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(116,102,255,0.18),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]"

export const DIALOG_DARK_PANEL_CLASS = DIALOG_PANEL_CLASS

export const DIALOG_DARK_GRADIENT_PANEL_CLASS = DIALOG_GRADIENT_PANEL_CLASS

export const FLOATING_DARK_PANEL_CLASS = FLOATING_PANEL_CLASS
