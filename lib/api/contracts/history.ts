import type { ApiSuccessResponse } from "@/lib/api/types"
import type { LearningHistory } from "@/features/history/types"

export interface LearningHistoryResponseData {
  items: LearningHistory[]
  total: number
  page: number
  hasMore: boolean
}

export type LearningHistoryResponse = ApiSuccessResponse<LearningHistoryResponseData>
