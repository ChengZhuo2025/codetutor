import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登录 - AI编程学习教练管理后台",
  description: "AI编程学习教练运营管理系统",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
