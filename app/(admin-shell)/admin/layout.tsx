import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ADMIN_ROUTES } from "@/constants/routes"
import { AdminShellClient } from "@/features/admin-shell/components/admin-shell-client"
import { getAdminSession } from "@/server/modules/admin-auth/service"

export const metadata: Metadata = {
  title: "AI编程学习教练 - 管理后台",
  description: "AI编程学习教练运营管理系统",
}

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    redirect(ADMIN_ROUTES.login)
  }

  return <AdminShellClient session={session}>{children}</AdminShellClient>
}
