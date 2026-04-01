import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ADMIN_ROUTES } from "@/constants/routes"
import { getAdminSession } from "@/server/modules/admin-auth/service"

export const metadata: Metadata = {
  title: "登录 - AI编程学习教练管理后台",
  description: "AI编程学习教练运营管理系统",
}

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (session) {
    redirect(ADMIN_ROUTES.home)
  }

  return <>{children}</>
}
