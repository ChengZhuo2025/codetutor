import { AgentDetail } from "./agent-detail"

type AgentDetailPageProps = {
  agentId: string
}

export default function AgentDetailPage({ agentId }: AgentDetailPageProps) {
  return <AgentDetail agentId={agentId} />
}
