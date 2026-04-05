import { LearningPathDetail } from "./learning-path-detail"

type LearningPathDetailPageProps = {
  pathId: string
}

export default function LearningPathDetailPage({ pathId }: LearningPathDetailPageProps) {
  return <LearningPathDetail pathId={pathId} />
}
