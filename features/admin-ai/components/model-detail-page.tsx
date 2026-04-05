import { ModelDetail } from "./model-detail"

type ModelDetailPageProps = {
  modelId: string
}

export default function ModelDetailPage({ modelId }: ModelDetailPageProps) {
  return <ModelDetail modelId={modelId} />
}
