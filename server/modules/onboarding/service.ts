import { ROUTES } from "@/constants/routes"
import type {
  CompleteOnboardingRequest,
  CompleteOnboardingResponseData,
  GetOnboardingPathOptionsResponseData,
  GetOnboardingToolsResponseData,
  OnboardingToolGroupContract,
} from "@/lib/api/contracts/onboarding"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

type JsonRecord = Record<string, unknown>

type ToolRow = {
  id: string
  code: string
  name: string
  tool_type: string
  difficulty_level: "beginner" | "intermediate" | "advanced"
  sort_order: number
  metadata: JsonRecord | null
}

type PathRow = {
  id: string
  code: string
  name: string
  stage_count: number
  source_type: "preset_training" | "self_directed"
  description: string | null
  metadata: JsonRecord | null
}

type StepRow = {
  id: string
  step_no: number
}

const GROUP_NAME_MAP: Record<string, string> = {
  gui: "图形化工具",
  cli: "CLI 工具",
  web: "在线工具",
}

const GROUP_ORDER = ["gui", "cli", "web"]

function readMetadataString(
  metadata: JsonRecord | null,
  key: string,
  fallback = "",
) {
  const value = metadata?.[key]
  return typeof value === "string" ? value : fallback
}

function readMetadataBoolean(
  metadata: JsonRecord | null,
  key: string,
  fallback = false,
) {
  const value = metadata?.[key]
  return typeof value === "boolean" ? value : fallback
}

function readMetadataStringArray(
  metadata: JsonRecord | null,
  key: string,
) {
  const value = metadata?.[key]

  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value.filter((item): item is string => typeof item === "string")
}

function mapToolGroups(rows: ToolRow[]): OnboardingToolGroupContract[] {
  const grouped = new Map<string, OnboardingToolGroupContract>()

  for (const row of rows) {
    const groupCode = row.tool_type
    const groupName = GROUP_NAME_MAP[groupCode] ?? row.tool_type
    const existing = grouped.get(groupCode) ?? {
      groupCode,
      groupName,
      tools: [],
    }

    existing.tools.push({
      id: row.id,
      code: row.code,
      name: row.name,
      difficultyLevel: row.difficulty_level,
      summary: readMetadataString(row.metadata, "summary"),
      category: readMetadataString(row.metadata, "category", groupName),
      popular: readMetadataBoolean(row.metadata, "popular"),
      color: (readMetadataString(row.metadata, "color", "brand") ||
        "brand") as "brand" | "chart-3" | "chart-5" | "gold",
    })

    grouped.set(groupCode, existing)
  }

  return GROUP_ORDER.map((groupCode) => grouped.get(groupCode)).filter(
    (group): group is OnboardingToolGroupContract => Boolean(group),
  )
}

function mapPathOptions(rows: PathRow[]) {
  return rows.map((row) => ({
    pathId: row.code,
    code: row.code.replace(/^path-/, ""),
    name: row.name,
    sourceType: "preset_training" as const,
    stageCount: row.stage_count,
    summary:
      readMetadataString(row.metadata, "summary") || row.description || "",
    recommended: readMetadataBoolean(row.metadata, "recommended"),
    currentLevelFit: readMetadataString(row.metadata, "currentLevelFit"),
    coachAgentLabel: readMetadataString(row.metadata, "coachAgentLabel"),
    estimatedDuration: readMetadataString(row.metadata, "estimatedDuration"),
    tags: readMetadataStringArray(row.metadata, "tags"),
    preview: readMetadataStringArray(row.metadata, "preview"),
  }))
}

export async function getOnboardingToolsData(): Promise<GetOnboardingToolsResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_tools")
    .select("id, code, name, tool_type, difficulty_level, sort_order, metadata")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  assertSupabaseSuccess(error, "failed to load onboarding tools")

  return {
    groups: mapToolGroups((data ?? []) as ToolRow[]),
  }
}

export async function getOnboardingPathOptionsData(
  toolCode: string,
  learningLevel: "beginner" | "intermediate" | "advanced",
): Promise<GetOnboardingPathOptionsResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const { data: tool, error: toolError } = await supabase
    .from("learning_tools")
    .select("id, code, name, metadata")
    .eq("code", toolCode)
    .eq("is_active", true)
    .maybeSingle()

  assertSupabaseSuccess(toolError, "failed to load selected onboarding tool")

  if (!tool) {
    return null
  }

  const { data: presetPaths, error: pathError } = await supabase
    .from("learning_paths")
    .select("id, code, name, stage_count, source_type, description, metadata")
    .eq("tool_id", tool.id)
    .eq("target_level", learningLevel)
    .eq("is_active", true)
    .eq("source_type", "preset_training")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  assertSupabaseSuccess(pathError, "failed to load onboarding path options")

  return {
    selfStudyOption: {
      id: `self-study-${toolCode}-${learningLevel}`,
      code: `self-study-${toolCode}-${learningLevel}`,
      name: "自主学习模式",
      sourceType: "self_directed",
      summary: `把你手头的教程、代码、链接或截图贴进来，我们会结合「${tool.name}」和你的基础，拆成一步步能练的小任务。`,
      preview: ["粘贴或上传材料", "先拿到「这一步做什么」", "卡住时接着问"],
      inputTypes: ["教程文本", "代码片段", "网页链接", "截图"],
    },
    presetPathOptions: mapPathOptions((presetPaths ?? []) as PathRow[]),
  }
}

export async function completeOnboarding(
  userId: string,
  request: CompleteOnboardingRequest,
): Promise<CompleteOnboardingResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const { toolCode, learningLevel, selectionMode, selectedPathId } = request

  const { data: tool, error: toolError } = await supabase
    .from("learning_tools")
    .select("id, code, name")
    .eq("code", toolCode)
    .eq("is_active", true)
    .maybeSingle()

  assertSupabaseSuccess(toolError, "failed to find onboarding tool")

  if (!tool) {
    return null
  }

  const targetPathCode =
    selectionMode === "self_directed"
      ? `path-${toolCode}-${learningLevel}-self-study`
      : selectedPathId

  if (!targetPathCode) {
    return null
  }

  const pathQuery =
    selectionMode === "self_directed"
      ? supabase
          .from("learning_paths")
          .select("id, code, name, description, stage_count, metadata")
          .eq("tool_id", tool.id)
          .eq("source_type", "self_directed")
          .eq("is_active", true)
          .order("target_level", { ascending: true })
          .limit(1)
          .maybeSingle()
      : supabase
          .from("learning_paths")
          .select("id, code, name, description, stage_count, metadata")
          .eq("code", targetPathCode)
          .eq("tool_id", tool.id)
          .eq("target_level", learningLevel)
          .eq("is_active", true)
          .maybeSingle()

  const { data: path, error: pathError } = await pathQuery

  assertSupabaseSuccess(pathError, "failed to find onboarding path template")

  if (!path) {
    return null
  }

  const { data: steps, error: stepError } = await supabase
    .from("path_steps")
    .select("id, step_no")
    .eq("path_id", path.id)
    .order("step_no", { ascending: true })

  assertSupabaseSuccess(stepError, "failed to load path steps")

  const orderedSteps = (steps ?? []) as StepRow[]

  if (orderedSteps.length === 0) {
    throw new Error(`Path template ${path.code} has no steps`)
  }

  const now = new Date().toISOString()

  const { data: existingProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, current_rank_code, current_score, streak_days")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query user profile")

  if (!existingProfile) {
    const { error: insertProfileError } = await supabase.from("user_profiles").insert({
      user_id: userId,
      primary_tool_id: tool.id,
      learning_level: learningLevel,
      current_rank_code: "rookie",
      current_score: 0,
      streak_days: 0,
      created_at: now,
      updated_at: now,
      metadata: {},
    })

    assertSupabaseSuccess(insertProfileError, "failed to create user profile")
  } else {
    const { error: updateProfileError } = await supabase
      .from("user_profiles")
      .update({
        primary_tool_id: tool.id,
        learning_level: learningLevel,
        updated_at: now,
      })
      .eq("user_id", userId)

    assertSupabaseSuccess(updateProfileError, "failed to update user profile")
  }

  const { error: preferenceError } = await supabase
    .from("user_learning_preferences")
    .upsert(
      {
        user_id: userId,
        preferred_tool_ids: [tool.id],
        onboarding_completed: true,
        primary_tool_id: tool.id,
        selected_path_id: selectionMode === "preset_training" ? path.id : null,
        selection_mode: selectionMode,
        goal_summary: path.name,
        content_language: "zh-CN",
        metadata: {
          selectedPathCode: path.code,
        },
        updated_at: now,
      },
      {
        onConflict: "user_id",
      },
    )

  assertSupabaseSuccess(preferenceError, "failed to upsert learning preferences")

  const { error: archiveError } = await supabase
    .from("user_learning_paths")
    .update({
      status: "archived",
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("status", "active")

  assertSupabaseSuccess(archiveError, "failed to archive previous active learning path")

  const { data: createdPath, error: createPathError } = await supabase
    .from("user_learning_paths")
    .insert({
      user_id: userId,
      template_path_id: path.id,
      tool_id: tool.id,
      path_code_snapshot: path.code,
      path_name_snapshot: path.name,
      path_summary_snapshot: path.description,
      learning_level: learningLevel,
      selection_mode: selectionMode,
      status: "active",
      total_steps: orderedSteps.length,
      completed_steps: 0,
      started_at: now,
      last_activity_at: now,
      metadata: {
        preview: readMetadataStringArray(path.metadata as JsonRecord | null, "preview"),
        seedSource: "api_onboarding_complete",
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(createPathError, "failed to create user learning path")

  if (!createdPath) {
    throw new Error("failed-to-create-user-learning-path")
  }

  const taskRows = orderedSteps.map((step, index) => ({
    user_id: userId,
    user_learning_path_id: createdPath.id,
    path_step_id: step.id,
    status: index === 0 ? "in_progress" : "not_started",
    started_at: index === 0 ? now : null,
    attempt_count: 0,
    score_awarded: 0,
    metadata: {},
    created_at: now,
    updated_at: now,
  }))

  const { data: createdTasks, error: taskError } = await supabase
    .from("user_tasks")
    .insert(taskRows)
    .select("id, path_step_id")

  assertSupabaseSuccess(taskError, "failed to create user tasks")

  const firstTaskId =
    orderedSteps
      .map((step) => createdTasks?.find((task) => task.path_step_id === step.id)?.id)
      .find((taskId): taskId is string => Boolean(taskId)) ?? null

  if (!firstTaskId) {
    throw new Error("failed to resolve the first generated task")
  }

  const { error: updatePathError } = await supabase
    .from("user_learning_paths")
    .update({
      current_task_id: firstTaskId,
      updated_at: now,
    })
    .eq("id", createdPath.id)

  assertSupabaseSuccess(updatePathError, "failed to update current task on user learning path")

  return {
    onboardingCompleted: true,
    primaryToolCode: tool.code,
    learningLevel,
    selectionMode,
    pathId: selectionMode === "preset_training" ? path.code : undefined,
    currentTaskId: firstTaskId,
    initialPreview: readMetadataStringArray(path.metadata as JsonRecord | null, "preview"),
    redirectTo: ROUTES.learn,
  }
}
