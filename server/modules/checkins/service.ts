import type { CheckinDailyResponseData } from "@/lib/api/contracts/checkin"
import { getRankName } from "@/constants/ranks"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import {
  awardDailyCheckinScore,
  ensureUserRankSnapshot,
} from "@/server/modules/gamification/service"
import { reconcileInterruptedLearningPaths } from "@/server/modules/learning-paths/service"
import {
  DAILY_CHECKIN_SCORE,
  getCheckinDateKey,
  resolveNextStreakDays,
} from "./logic"

type UserProfileRow = {
  user_id: string
  current_score: number
  current_rank_code: string
  streak_days: number
}

type DailyCheckinRow = {
  id: string
  checkin_date: string
  score_awarded: number
}

type ActivePathRow = {
  id: string
}

async function loadProfile(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, current_score, current_rank_code, streak_days")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load profile for daily checkin")

  return (data as UserProfileRow | null) ?? null
}

async function loadLatestCheckin(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("id, checkin_date, score_awarded")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load latest daily checkin")

  return (data as DailyCheckinRow | null) ?? null
}

async function loadActivePath(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load active learning path for daily checkin")

  return (data as ActivePathRow | null) ?? null
}

function buildStableIdempotencyKey(userId: string, checkinDate: string) {
  return `daily-checkin:${userId}:${checkinDate}`
}

export async function createDailyCheckin(userId: string): Promise<CheckinDailyResponseData | null> {
  await reconcileInterruptedLearningPaths(userId)

  const profile = await loadProfile(userId)

  if (!profile) {
    return null
  }

  const latestCheckin = await loadLatestCheckin(userId)
  const todayDate = getCheckinDateKey()
  const streakResult = resolveNextStreakDays({
    previousCheckinDate: latestCheckin?.checkin_date ?? null,
    currentStreakDays: profile.streak_days,
    todayDate,
  })

  if (streakResult.alreadyCheckedInToday) {
    return {
      checkedIn: true,
      alreadyCheckedIn: true,
      checkinDate: todayDate,
      scoreDelta: 0,
      streakDays: streakResult.nextStreakDays,
      currentScore: profile.current_score,
      currentRank: getRankName(profile.current_rank_code),
      rankChanged: false,
    }
  }

  const now = new Date().toISOString()
  const nextScore = profile.current_score + DAILY_CHECKIN_SCORE
  const supabase = createSupabaseAdminClient()
  const activePath = await loadActivePath(userId)

  const { error: checkinError } = await supabase
    .from("daily_checkins")
    .insert({
      user_id: userId,
      checkin_date: todayDate,
      score_awarded: DAILY_CHECKIN_SCORE,
      idempotency_key: buildStableIdempotencyKey(userId, todayDate),
      created_at: now,
    })

  assertSupabaseSuccess(checkinError, "failed to create daily checkin")

  await awardDailyCheckinScore(supabase, {
    userId,
    checkinDate: todayDate,
    scoreDelta: DAILY_CHECKIN_SCORE,
    sourceRef: activePath?.id ?? "achievements",
    remark: "完成每日打卡",
    createdAt: now,
  })

  const rankSnapshot = await ensureUserRankSnapshot(supabase, {
    userId,
    currentScore: nextScore,
    updatedAt: now,
  })

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      current_score: nextScore,
      current_rank_code: rankSnapshot.rankCode,
      streak_days: streakResult.nextStreakDays,
      last_learning_at: now,
      updated_at: now,
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(profileError, "failed to update profile after daily checkin")

  if (activePath) {
    const { error: pathError } = await supabase
      .from("user_learning_paths")
      .update({
        last_activity_at: now,
        updated_at: now,
      })
      .eq("id", activePath.id)
      .eq("user_id", userId)
      .eq("status", "active")

    assertSupabaseSuccess(pathError, "failed to touch active path after daily checkin")
  }

  return {
    checkedIn: true,
    alreadyCheckedIn: false,
    checkinDate: todayDate,
    scoreDelta: DAILY_CHECKIN_SCORE,
    streakDays: streakResult.nextStreakDays,
    currentScore: nextScore,
    currentRank: getRankName(rankSnapshot.rankCode),
    rankChanged: rankSnapshot.rankCode !== profile.current_rank_code,
  }
}
