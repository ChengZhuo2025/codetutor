import type { ApiSuccessResponse } from "@/lib/api/types"
import { getRankName } from "@/constants/ranks"
import { AUTH_PREVIEW_TOOL_CODES, getToolName } from "@/constants/tools"
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
    avatarUrl: null,
    phone: "13800138000",
    email: "xiaoming@example.com",
    wechat: "xiaoming_dev",
    bio: "正在学习 AI 编程，希望用 AI 工具提升开发效率。",
    primaryTool: {
      code: "cursor",
      name: getToolName("cursor"),
    },
    learningLevel: "beginner",
    currentScore: 680,
    currentRank: getRankName("vibe_coder"),
    streakDays: 7,
    completedTaskCount: 14,
    lastLearningAt: "2026-03-24T14:32:00+08:00",
  },
}

export const mockAuthPreviewResponse: ApiSuccessResponse<AuthPreviewContract> = {
  code: "OK",
  message: "success",
  data: {
    previewTools: AUTH_PREVIEW_TOOL_CODES.map((code) => getToolName(code)),
    previewSteps: [
      {
        id: 1,
        title: `安装 ${getToolName("cursor")} 编辑器`,
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
    resumeTitle: `${getToolName("cursor")} 入门 · 第 1 关`,
    resumeSummary: "还差一步：打开项目并发起第一次 AI 对话。",
  },
}
