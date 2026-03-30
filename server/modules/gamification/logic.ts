export type RankCode = "rookie" | "apprentice" | "vibe_coder" | "builder" | "master"

export type ScoreEventType =
  | "task_completion"
  | "daily_checkin"
  | "achievement_reward"
  | "manual_adjustment"
  | "migration_backfill"

const RANK_THRESHOLDS: Array<{
  code: RankCode
  minScore: number
  maxScore: number
}> = [
  { code: "rookie", minScore: 0, maxScore: 200 },
  { code: "apprentice", minScore: 200, maxScore: 500 },
  { code: "vibe_coder", minScore: 500, maxScore: 1000 },
  { code: "builder", minScore: 1000, maxScore: 2000 },
  { code: "master", minScore: 2000, maxScore: Number.POSITIVE_INFINITY },
]

export function deriveRankSnapshot(score: number) {
  const safeScore = Math.max(0, score)
  const currentIndex = RANK_THRESHOLDS.findIndex(
    (rank) => safeScore >= rank.minScore && safeScore < rank.maxScore,
  )
  const resolvedIndex = currentIndex >= 0 ? currentIndex : RANK_THRESHOLDS.length - 1
  const currentRank = RANK_THRESHOLDS[resolvedIndex]
  const nextRank = RANK_THRESHOLDS[resolvedIndex + 1] ?? null

  return {
    rankCode: currentRank.code,
    nextRankCode: nextRank?.code ?? null,
    scoreToNextRank: nextRank ? Math.max(0, nextRank.minScore - safeScore) : 0,
  }
}

export function buildTaskScoreLedgerEntry(input: {
  userId: string
  taskId: string
  scoreDelta: number
  sourceRef?: string | null
  remark?: string | null
}) {
  return {
    user_id: input.userId,
    task_id: input.taskId,
    event_type: "task_completion" as const,
    score_delta: input.scoreDelta,
    idempotency_key: `task-complete:${input.taskId}`,
    source_ref: input.sourceRef ?? null,
    remark: input.remark ?? null,
  }
}
