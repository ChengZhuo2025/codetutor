import AgentDetailPage from "@/features/admin-ai/components/agent-detail-page"

type PageProps = {
  params: Promise<{ agentId: string }>
}

export default async function Page({ params }: PageProps) {
  const { agentId } = await params
  return <AgentDetailPage agentId={agentId} />
}
