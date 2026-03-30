import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  HistoryFilter,
  HistoryPlanAction,
  LearningHistory,
  LearningHistoryDetail,
  LearningHistorySummary,
} from "@/features/history/types"

export interface LearningHistoryResponseData {
  items: LearningHistory[]
  total: number
  page: number
  hasMore: boolean
  filter: HistoryFilter
  summary: LearningHistorySummary
}

export interface UpdateLearningHistoryStatusRequest {
  action: HistoryPlanAction
}

export interface UpdateLearningHistoryStatusResponseData {
  pathId: string
  status: LearningHistory["status"]
}

export interface LearningHistoryDetailResponseData {
  detail: LearningHistoryDetail
}

export type LearningHistoryResponse = ApiSuccessResponse<LearningHistoryResponseData>
