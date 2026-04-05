import type { AdminRoleCode } from "@/lib/api/contracts/admin"

export function canAccessAdminAI(roles: AdminRoleCode[]) {
  return roles.includes("super_admin") || roles.includes("ai_ops_admin")
}
