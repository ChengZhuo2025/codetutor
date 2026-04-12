import { LearningPathSessionsPage } from "./learning-path-sessions-page"

type LearningPathSessionsDetailPageProps = {
  pathId: string
  initialSessionId?: string
}

export default function LearningPathSessionsDetailPage({
  pathId,
  initialSessionId,
}: LearningPathSessionsDetailPageProps) {
  return <LearningPathSessionsPage pathId={pathId} initialSessionId={initialSessionId} />
}
