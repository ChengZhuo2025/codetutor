import { InvocationDetail } from "./invocation-detail"

type InvocationDetailPageProps = {
  invocationId: string
}

export default function InvocationDetailPage({ invocationId }: InvocationDetailPageProps) {
  return <InvocationDetail invocationId={invocationId} />
}
