import LearningPathDetailPage from "@/features/admin-learning/components/learning-path-detail-page"

type PageProps = {
  params: Promise<{ pathId: string }>
}

export default async function Page({ params }: PageProps) {
  const { pathId } = await params
  return <LearningPathDetailPage pathId={pathId} />
}
