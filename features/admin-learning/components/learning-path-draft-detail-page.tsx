import { LearningPathDraftPage } from "./learning-path-draft-page"

type LearningPathDraftDetailPageProps = {
  pathId: string
}

export default function LearningPathDraftDetailPage({ pathId }: LearningPathDraftDetailPageProps) {
  return <LearningPathDraftPage pathId={pathId} />
}
