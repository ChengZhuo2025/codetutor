type RankCode = "rookie" | "apprentice" | "vibe_coder" | "builder" | "master"

const RANK_THRESHOLDS: Array<{
  code: RankCode
  minScore: number
  maxScore: number
}> = [
  { code: "rookie", minScore: 0, maxScore: 200 },
  { code: "apprentice", minScore: 200, maxScore: 500 },
  { code: "vibe_coder", minScore: 500, maxScore: 1000 },
  { code: "builder", minScore: 1000, maxScore: 2000 },
  { code: "master", minScore: 2000, maxScore: 9999 },
]

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

export function getRankCodeForScore(score: number): RankCode {
  const safeScore = Math.max(0, score)

  return (
    RANK_THRESHOLDS.find((rank) => safeScore >= rank.minScore && safeScore < rank.maxScore)?.code
    ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1].code
  )
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
