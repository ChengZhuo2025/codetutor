import "server-only"

import type {
  LearningAttachmentCreateResponseData,
  LearningMessageAttachment,
  LearningMessageAttachmentKind,
} from "@/lib/api/contracts/learning"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  getLearningChatAttachmentStoragePrefix,
  LEARNING_CHAT_ATTACHMENT_BUCKET,
} from "@/lib/supabase/storage"
import { assertSupabaseSuccess } from "@/server/lib/supabase-result"

type CreateLearningAttachmentInput = {
  kind: LearningMessageAttachmentKind
  file: File
  sessionId?: string | null
  durationMs?: number | null
  width?: number | null
  height?: number | null
}

type LearningMessageAttachmentRow = {
  id: string
  kind: LearningMessageAttachmentKind
  processing_status: LearningMessageAttachment["processingStatus"]
  original_filename: string | null
  mime_type: string
  size_bytes: number
  duration_ms: number | null
  width: number | null
  height: number | null
  extracted_text: string | null
  visual_summary: string | null
  transcript_text: string | null
  error_message: string | null
  created_at: string
}

function extensionFromFile(file: File, kind: LearningMessageAttachmentKind) {
  const filename = file.name.trim()
  const extension = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : null

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension
  }

  if (kind === "image") {
    if (file.type === "image/png") return "png"
    if (file.type === "image/webp") return "webp"
    return "jpg"
  }

  if (file.type === "audio/ogg") return "ogg"
  if (file.type === "audio/mpeg" || file.type === "audio/mp3") return "mp3"
  if (file.type === "audio/mp4" || file.type === "audio/x-m4a") return "m4a"
  return "webm"
}

function toAttachmentContract(row: LearningMessageAttachmentRow): LearningMessageAttachment {
  return {
    id: row.id,
    kind: row.kind,
    processingStatus: row.processing_status,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationMs: row.duration_ms,
    width: row.width,
    height: row.height,
    extractedText: row.extracted_text,
    visualSummary: row.visual_summary,
    transcriptText: row.transcript_text,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}

export async function createLearningMessageAttachment(
  userId: string,
  input: CreateLearningAttachmentInput,
): Promise<LearningAttachmentCreateResponseData> {
  const supabase = createSupabaseAdminClient()
  const extension = extensionFromFile(input.file, input.kind)
  const storagePath = `${getLearningChatAttachmentStoragePrefix(userId)}${crypto.randomUUID()}.${extension}`
  const bytes = await input.file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(LEARNING_CHAT_ATTACHMENT_BUCKET)
    .upload(storagePath, bytes, {
      contentType: input.file.type,
      upsert: false,
    })

  assertSupabaseSuccess(uploadError, "failed to upload learning message attachment")

  const { data, error } = await supabase
    .from("learning_message_attachments")
    .insert({
      user_id: userId,
      session_id: input.sessionId ?? null,
      kind: input.kind,
      processing_status: "pending",
      storage_bucket: LEARNING_CHAT_ATTACHMENT_BUCKET,
      storage_path: storagePath,
      original_filename: input.file.name || null,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      duration_ms: input.durationMs ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      metadata: {},
    })
    .select(
      "id, kind, processing_status, original_filename, mime_type, size_bytes, duration_ms, width, height, extracted_text, visual_summary, transcript_text, error_message, created_at",
    )
    .single()

  assertSupabaseSuccess(error, "failed to create learning message attachment")

  return {
    attachment: toAttachmentContract(data as LearningMessageAttachmentRow),
  }
}
