import InvocationDetailPage from "@/features/admin-ai/components/invocation-detail-page"

type PageProps = {
  params: Promise<{ invocationId: string }>
}

export default async function Page({ params }: PageProps) {
  const { invocationId } = await params
  return <InvocationDetailPage invocationId={invocationId} />
}
