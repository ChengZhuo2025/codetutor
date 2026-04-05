import ModelDetailPage from "@/features/admin-ai/components/model-detail-page"

type PageProps = {
  params: Promise<{ modelId: string }>
}

export default async function Page({ params }: PageProps) {
  const { modelId } = await params
  return <ModelDetailPage modelId={modelId} />
}
