import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  AuthPreviewContract,
  ProfileMeResponseData,
} from "@/lib/api/contracts/auth"

export const mockProfileMeResponse: ApiSuccessResponse<ProfileMeResponseData> = {
  code: "OK",
  message: "success",
  data: {
    userId: "user-demo-001",
    nickname: "陈小明",
    primaryTool: {
      code: "cursor",
      name: "Cursor",
    },
    learningLevel: "beginner",
    currentScore: 680,
    currentRank: "Vibe Coder",
    streakDays: 7,
    completedTaskCount: 14,
    lastLearningAt: "2026-03-24T14:32:00+08:00",
  },
}

export const mockAuthPreviewResponse: ApiSuccessResponse<AuthPreviewContract> = {
  code: "OK",
  message: "success",
  data: {
    previewTools: ["Cursor", "Claude Code", "Codex", "Google Stitch"],
    previewSteps: [
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
        active: false,
      },
    ],
    resumeTitle: "Cursor 入门 · 第 1 关",
    resumeSummary: "还差一步：打开项目并发起第一次 AI 对话。",
  },
}
