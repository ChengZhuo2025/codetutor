import { ProviderDetail } from "./provider-detail"

type ProviderDetailPageProps = {
  providerId: string
}

export default function ProviderDetailPage({ providerId }: ProviderDetailPageProps) {
  return <ProviderDetail providerId={providerId} />
}
