import type { AuthPreviewStep } from "@/features/auth/types"

export const loginPreviewTools = ["Cursor", "GitHub Copilot", "v0", "Bolt"]

export const loginPreviewSteps: AuthPreviewStep[] = [
  {
    id: 1,
    title: "安装 Cursor 编辑器",
    description: "从 cursor.com 下载并完成安装",
    active: true,
  },
  {
    id: 2,
    title: "打开你的第一个项目",
    description: "用 File › Open Folder 打开任意目录",
  },
]
