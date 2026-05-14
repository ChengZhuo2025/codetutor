import { Suspense } from "react"
import { AdminLoginForm } from "@/features/admin-shell/components/admin-login-form"

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  )
}
