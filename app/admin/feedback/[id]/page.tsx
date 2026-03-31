import FeedbackDetailPage from "@/features/admin-feedback/components/feedback-detail-page"

interface FeedbackDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function FeedbackDetailPageRoute(props: FeedbackDetailPageProps) {
  const params = await props.params
  return <FeedbackDetailPage ticketId={params.id} />
}
