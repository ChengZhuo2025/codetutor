import { Suspense } from "react"
import { AdminNotificationList } from "@/features/admin-notifications/components/admin-notification-list"

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={null}>
      <AdminNotificationList />
    </Suspense>
  )
}
