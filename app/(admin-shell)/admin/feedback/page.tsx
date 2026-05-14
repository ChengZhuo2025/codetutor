import { Suspense } from "react"
import FeedbackListPage from "@/features/admin-feedback/components/feedback-list-page"

export default function FeedbackListPageRoute() {
  return (
    <Suspense fallback={null}>
      <FeedbackListPage />
    </Suspense>
  )
}
