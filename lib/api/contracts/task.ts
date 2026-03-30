export type TaskStatusUpdateValue = "in_progress" | "blocked"

export type CompleteTaskRequest = {
  taskId: string
  conversationId?: string | null
}

export type CompleteTaskResponseData = {
  taskId: string
  taskStatus: "completed"
  scoreDelta: number
  currentScore: number
  currentRank: string
  rankChanged: boolean
  completionSummary: string
  nextTask: {
    taskId: string
    title: string
  } | null
}

export type UpdateTaskStatusRequest = {
  taskId: string
  status: TaskStatusUpdateValue
  reason?: string | null
}

export type UpdateTaskStatusResponseData = {
  taskId: string
  taskStatus: TaskStatusUpdateValue
  reason: string | null
}
