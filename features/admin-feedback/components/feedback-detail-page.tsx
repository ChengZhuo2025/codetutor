import { FeedbackDetail } from "./feedback-detail"

interface FeedbackDetailPageProps {
  ticketId: string
}

export default function FeedbackDetailPage({ ticketId }: FeedbackDetailPageProps) {
  return <FeedbackDetail ticketId={ticketId} />
}
