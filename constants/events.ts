export const APP_EVENTS = {
  landingCtaClick: "landing_cta_click",
  loginSubmit: "login_submit",
  onboardingSubmit: "onboarding_submit",
  learningInputSend: "learning_input_send",
  learningQuickHelp: "learning_quick_help",
  sessionResumed: "session_resumed",
  stuckHelpRequested: "stuck_help_requested",
  taskCompleted: "task_completed",
  mapStageClick: "map_stage_click",
  achievementCtaClick: "achievement_cta_click",
} as const

export const APP_EVENT_CHANNEL = "code-tutor:event"

export type AppEventName = (typeof APP_EVENTS)[keyof typeof APP_EVENTS]
