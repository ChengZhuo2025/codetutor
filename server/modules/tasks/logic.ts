import { deriveRankSnapshot } from "../gamification/logic.ts"

export type TaskPersistentStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "completed"
  | "archived"

export type TaskProgressionInput = {
  currentTaskId: string
  totalSteps: number
  tasks: Array<{
    id: string
    stepNo: number
    status: TaskPersistentStatus
  }>
}

export function getRankCodeForScore(score: number) {
  return deriveRankSnapshot(score).rankCode
}

export function resolveTaskProgression(input: TaskProgressionInput) {
  const orderedTasks = [...input.tasks].sort((left, right) => left.stepNo - right.stepNo)
  const currentTask = orderedTasks.find((task) => task.id === input.currentTaskId)

  if (!currentTask) {
    throw new Error("当前任务不属于该学习路径。")
  }

  const completedTaskIds = new Set(
    orderedTasks.filter((task) => task.status === "completed").map((task) => task.id),
  )
  completedTaskIds.add(input.currentTaskId)

  const nextTask = orderedTasks.find((task) => !completedTaskIds.has(task.id)) ?? null
  const resolvedTotalSteps = Math.max(input.totalSteps, orderedTasks.length)
  const completedSteps = Math.min(resolvedTotalSteps, completedTaskIds.size)

  return {
    completedSteps,
    nextTaskId: nextTask?.id ?? null,
    pathCompleted: nextTask === null || completedSteps >= resolvedTotalSteps,
  }
}
