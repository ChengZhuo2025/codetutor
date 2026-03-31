import type { Metadata } from "next"
import { AdminLayout } from "@/features/admin-shell/components/admin-layout"

export const metadata: Metadata = {
  title: "AI编程学习教练 - 管理后台",
  description: "AI编���学习教练运营管理系统",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
