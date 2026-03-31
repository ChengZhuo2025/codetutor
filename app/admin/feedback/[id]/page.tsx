import { FeedbackDetail } from "@/features/admin-feedback/components/feedback-detail"

interface FeedbackDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function FeedbackDetailPage(props: FeedbackDetailPageProps) {
  const params = await props.params
  return <FeedbackDetail ticketId={params.id} />
}
