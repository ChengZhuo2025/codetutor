import { WorkspaceLayoutProvider } from "@/providers/workspace-layout-provider"
import { WorkspaceSidebarDataProvider } from "@/providers/workspace-sidebar-provider"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceSidebarDataProvider>
      <WorkspaceLayoutProvider>{children}</WorkspaceLayoutProvider>
    </WorkspaceSidebarDataProvider>
  )
}
