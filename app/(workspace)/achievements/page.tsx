import { Suspense } from "react"
import { AchievementsPage } from "@/features/achievement/pages/achievements-page"

export default function AchievementsRoutePage() {
  return (
    <Suspense fallback={null}>
      <AchievementsPage />
    </Suspense>
  )
}
