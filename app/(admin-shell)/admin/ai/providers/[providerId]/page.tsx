import ProviderDetailPage from "@/features/admin-ai/components/provider-detail-page"

type PageProps = {
  params: Promise<{ providerId: string }>
}

export default async function Page({ params }: PageProps) {
  const { providerId } = await params
  return <ProviderDetailPage providerId={providerId} />
}
