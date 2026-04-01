import { WorkspaceSidebarDataProvider } from "@/providers/workspace-sidebar-provider"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WorkspaceSidebarDataProvider>{children}</WorkspaceSidebarDataProvider>
}
