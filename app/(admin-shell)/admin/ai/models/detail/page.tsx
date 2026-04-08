import { notFound } from "next/navigation"
import ModelDetailPage from "@/features/admin-ai/components/model-detail-page"

type PageProps = {
  searchParams: Promise<{ modelId?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const modelId = params.modelId?.trim() ?? ""
  if (!modelId) {
    notFound()
  }
  return <ModelDetailPage modelId={modelId} />
}
