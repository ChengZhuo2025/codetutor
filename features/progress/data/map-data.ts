import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  ProgressCurrentResponseData,
  ProgressMapResponseData,
} from "@/lib/api/contracts/progress"
import { mockProfileMeResponse } from "@/features/auth/data/login-data"
import { currentLearningPlan } from "@/lib/mocks/current-learning-plan"

const completedSteps = currentLearningPlan.stages.filter((stage) => stage.status === "done").length
const currentStage =
  currentLearningPlan.stages.find((stage) => stage.status === "current") ??
  currentLearningPlan.stages[0]

export const mockProgressCurrentResponse: ApiSuccessResponse<ProgressCurrentResponseData> = {
  code: "OK",
  message: "success",
  data: {
    currentTool: currentLearningPlan.tool,
    currentPathName: currentLearningPlan.pathName,
    currentTaskTitle: currentStage.title,
    currentScore: mockProfileMeResponse.data.currentScore,
    currentRank: mockProfileMeResponse.data.currentRank,
    streakDays: mockProfileMeResponse.data.streakDays,
    checkedInToday: true,
    summary: {
      totalXP: mockProfileMeResponse.data.currentScore,
      currentRank: mockProfileMeResponse.data.currentRank,
      nextRank: "AI 建造者",
      remainingXPToNextRank: 320,
      streakDays: mockProfileMeResponse.data.streakDays,
    },
  },
}

export const mockProgressMapResponse: ApiSuccessResponse<ProgressMapResponseData> = {
  code: "OK",
  message: "success",
  data: {
    pathName: currentLearningPlan.pathName,
    pathSummary: currentLearningPlan.pathSummary,
    totalSteps: currentLearningPlan.stages.length,
    completedSteps,
    currentStageId: currentStage.id,
    stages: currentLearningPlan.stages.map((stage) => ({
      ...stage,
      unlockHint:
        stage.status === "locked" && currentStage
          ? `完成第 ${currentStage.id} 关后解锁`
          : undefined,
    })),
  },
}
