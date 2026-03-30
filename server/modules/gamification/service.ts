import type { SupabaseClient } from "@supabase/supabase-js"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import {
  buildTaskScoreLedgerEntry,
  deriveRankSnapshot,
} from "./logic"

type EnsureUserRankSnapshotInput = {
  userId: string
  currentScore: number
  updatedAt?: string
}

type AwardTaskCompletionScoreInput = {
  userId: string
  taskId: string
  scoreDelta: number
  sourceRef?: string | null
  remark?: string | null
  createdAt?: string
}

export async function ensureUserRankSnapshot(
  supabase: SupabaseClient,
  input: EnsureUserRankSnapshotInput,
) {
  const rankSnapshot = deriveRankSnapshot(input.currentScore)
  const updatedAt = input.updatedAt ?? new Date().toISOString()

  const { error } = await supabase
    .from("user_ranks")
    .upsert(
      {
        user_id: input.userId,
        rank_code: rankSnapshot.rankCode,
        score_snapshot: input.currentScore,
        next_rank_code: rankSnapshot.nextRankCode,
        score_to_next_rank: rankSnapshot.scoreToNextRank,
        updated_at: updatedAt,
      },
      {
        onConflict: "user_id",
      },
    )

  assertSupabaseSuccess(error, "failed to upsert user rank snapshot")

  return rankSnapshot
}

export async function awardTaskCompletionScore(
  supabase: SupabaseClient,
  input: AwardTaskCompletionScoreInput,
) {
  if (input.scoreDelta <= 0) {
    return null
  }

  const createdAt = input.createdAt ?? new Date().toISOString()
  const ledgerEntry = buildTaskScoreLedgerEntry({
    userId: input.userId,
    taskId: input.taskId,
    scoreDelta: input.scoreDelta,
    sourceRef: input.sourceRef,
    remark: input.remark,
  })

  const { error } = await supabase
    .from("score_ledgers")
    .upsert(
      {
        ...ledgerEntry,
        created_at: createdAt,
      },
      {
        onConflict: "idempotency_key",
        ignoreDuplicates: true,
      },
    )

  assertSupabaseSuccess(error, "failed to insert task completion score ledger")

  return ledgerEntry
}
