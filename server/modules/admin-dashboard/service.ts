// 管理员看板服务
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import type { AdminDashboardOverviewResponseData } from "@/lib/api/contracts/admin"

/**
 * 获取总览看板数据
 */
export async function getDashboardOverview(): Promise<AdminDashboardOverviewResponseData> {
  const supabase = createSupabaseAdminClient()

  // 获取今日起始时间
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()

  // 1. 待处理反馈数
  const { count: pendingFeedbackCount, error: feedbackError } = await supabase
    .from("feedback_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted")

  assertSupabaseSuccess(feedbackError, "failed to query pending feedback count")

  // 2. 今日新增用户数 (使用 auth.users 的 created_at)
  // 由于直接查��� auth.users 较复杂，改用统计 user_profiles 的 created_at
  const { count: todayNewUserCount, error: userError } = await supabase
    .from("user_profiles")
    .select("user_id", { count: "exact", head: true })
    .gte("created_at", todayStart)

  assertSupabaseSuccess(userError, "failed to query today new users")

  // 3. 今日完成任务数
  const { count: todayCompletedTaskCount, error: taskError } = await supabase
    .from("user_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", todayStart)

  assertSupabaseSuccess(taskError, "failed to query today completed tasks")

  // 4. 活跃学习计划数
  const { count: activeLearningPathCount, error: pathError } = await supabase
    .from("user_learning_paths")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")

  assertSupabaseSuccess(pathError, "failed to query active learning paths")

  // 5. 今日打卡人数
  const { data: todayCheckins, error: checkinError } = await supabase
    .from("daily_checkins")
    .select("user_id")
    .gte("checkin_date", todayStart)

  assertSupabaseSuccess(checkinError, "failed to query today checkins")

  const uniqueCheckinUsers = new Set((todayCheckins ?? []).map((c) => c.user_id)).size

  return {
    pendingFeedbackCount: pendingFeedbackCount ?? 0,
    todayNewUserCount: todayNewUserCount ?? 0,
    todayCompletedTaskCount: todayCompletedTaskCount ?? 0,
    activeLearningPathCount: activeLearningPathCount ?? 0,
    todayCheckinCount: uniqueCheckinUsers,
  }
}
