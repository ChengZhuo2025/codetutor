export const ROUTES = {
  home: "/",
  login: "/login",
  authCallback: "/auth/callback",
  onboarding: "/onboarding",
  learn: "/learn",
  map: "/map",
  achievements: "/achievements",
  history: "/history",
  orders: "/orders",
  apiDocs: "/api-docs",
} as const

export const USER_PROTECTED_ROUTES = [
  ROUTES.onboarding,
  ROUTES.learn,
  ROUTES.map,
  ROUTES.achievements,
  ROUTES.history,
  ROUTES.orders,
] as const

export const ADMIN_ROUTES = {
  login: "/admin/login",
  home: "/admin",
  feedback: "/admin/feedback",
  users: "/admin/users",
  learning: "/admin/learning",
  ai: "/admin/ai",
  finance: "/admin/finance",
  settings: "/admin/settings",
} as const

export const MARKETING_SECTIONS = {
  home: "#home",
  how: "#how",
  tools: "#tools",
  benefits: "#benefits",
  pricing: "#pricing",
  start: "#start",
  about: "#about",
} as const
