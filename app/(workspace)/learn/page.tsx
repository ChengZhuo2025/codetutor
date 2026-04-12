import { Suspense } from "react"
import { LearnPage } from "@/features/learning/pages/learn-page"

export default function LearnRoutePage() {
  return (
    <Suspense fallback={null}>
      <LearnPage />
    </Suspense>
  )
}
