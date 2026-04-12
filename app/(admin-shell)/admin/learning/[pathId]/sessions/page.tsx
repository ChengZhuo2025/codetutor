import LearningPathSessionsDetailPage from "@/features/admin-learning/components/learning-path-sessions-detail-page"

type PageProps = {
  params: Promise<{ pathId: string }>
  searchParams: Promise<{ sessionId?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { pathId } = await params
  const { sessionId } = await searchParams
  return <LearningPathSessionsDetailPage pathId={pathId} initialSessionId={sessionId} />
}
