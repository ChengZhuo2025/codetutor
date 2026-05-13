# Learning Chat Multimodal Attachments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let learners send images and voice messages in `/learn`, with images understood through vision-capable models or a vision translator fallback, and voice messages transcribed before normal tutor reply generation.

**Architecture:** Add a first-class learning chat attachment layer instead of embedding raw files in message text. `/api/learning/attachments` owns upload registration and processing metadata; `/api/learning/message` accepts `attachmentIds`, performs deterministic media preprocessing, and then injects normalized text or multimodal parts into the existing tutor orchestration. Teaching agents remain focused on tutoring, while media translator agents provide image understanding and ASR.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres + Storage, existing learning AI provider abstraction, existing admin AI model profiles and agent bindings.

---

## Current Facts

- `POST /api/learning/message` currently sends `request.content.trim()` as a plain text user message.
- `server/modules/learning/provider.ts` already supports `AIChatContentPart` entries for `image_url`, `audio_url`, and `video_url`.
- `ai_models.runtime_capabilities` already supports structured capabilities such as `vision` and `asr`.
- Current seeded primary tutor models are text-first and should not be assumed to understand images directly.
- The self-directed material pipeline already has separate multimodal extraction concepts; this plan brings the same separation to live chat.

## 2026-05-13 Model Switch Note

- Learning chat image preprocessing now sends private Supabase Storage images to the vision model as `data:<mime>;base64,...` URLs, avoiding provider-side failures when the model cannot fetch signed private URLs.
- The media model seed switches image recognition to Aliyun Bailian `Qwen3.6-Flash` (`model_name = qwen3.6-flash`, `code = qwen3-6-flash`) and voice recognition to Aliyun Bailian `Qwen3-ASR-Flash` (`model_name = qwen3-asr-flash`, `code = qwen3-asr-flash`).
- `Qwen3-ASR-Flash` uses Bailian OpenAI-compatible `/chat/completions` with `input_audio`, not the legacy `/audio/transcriptions` multipart endpoint.
- The remote seed has been applied successfully, and runtime resolution now returns `aliyuncs/qwen3-6-flash` for `vision` and `aliyuncs/qwen3-asr-flash` for `asr`; the old `qwen2-5-vl-72b` and `sensevoice-small` media models are inactive.

## Phase 1: Persistence and Contracts

**Files:**
- Create: `supabase/migrations/043_create_learning_message_attachments.sql`
- Modify: `supabase/migrations/README.md`
- Modify: `lib/api/contracts/learning.ts`
- Modify: `server/modules/api-docs/openapi.ts`
- Modify: `server/modules/api-docs/schemas.ts`

**Steps:**
1. Add enum `learning_message_attachment_kind` with `image` and `audio`.
2. Add enum `learning_message_attachment_status` with `pending`, `processing`, `completed`, and `failed`.
3. Create table `public.learning_message_attachments` with user ownership, optional `session_id`, optional `message_id`, storage metadata, processing result fields, and JSON metadata.
4. Add indexes for `user_id`, `session_id`, `message_id`, and processing status.
5. Create private Supabase Storage bucket `learning-chat-attachments` where possible through SQL.
6. Add contract types for attachment creation, attachment DTOs, and `LearningMessageRequest.attachmentIds`.
7. Update OpenAPI schemas and endpoint docs for the new request shape.
8. Run `pnpm lint`.

**Acceptance:**
- Migration is idempotent.
- Existing text-only `LearningMessageRequest` remains valid.
- API docs expose `attachmentIds` without making attachments required.

## Phase 2: Attachment Upload Endpoint

**Files:**
- Create: `app/api/learning/attachments/route.ts`
- Create: `server/modules/learning/attachments.ts`
- Modify: `server/modules/learning/route-handler.ts`
- Modify: `server/lib/request-validation.ts` if shared validation helpers are needed
- Modify: `server/modules/api-docs/openapi.ts`
- Modify: `server/modules/api-docs/schemas.ts`

**Steps:**
1. Implement authenticated `POST /api/learning/attachments`.
2. Accept multipart form data with `file`, `kind`, optional `sessionId`, and optional client metadata.
3. Validate image constraints: max 3 attachments per future message, each <= 5MB, `png/jpg/jpeg/webp`.
4. Validate audio constraints: one audio per future message, <= 60 seconds where browser duration is supplied, supported browser formats `webm/ogg/mp3/m4a`.
5. Upload to the private bucket under `userId/yyyy/mm/<uuid>.<ext>`.
6. Insert `learning_message_attachments` row with `pending` status.
7. Return a DTO containing `attachmentId`, display metadata, and no permanent public URL.
8. Run `pnpm lint`.

**Acceptance:**
- Unauthenticated uploads return auth-required response.
- Invalid MIME or oversized files return 422.
- Successful upload returns an attachment id owned by the user.

## Phase 3: Backend Media Preprocessing and Message Orchestration

**Status:** Implemented in the first backend pass. The code currently reuses the existing material-pipeline `vision` / `asr` model resolution helpers for deterministic media preprocessing. Dedicated `learning-vision-translator` and `learning-audio-transcriber` agent seeds remain in Phase 4 so admin-facing agent configuration can be added cleanly.

**Files:**
- Modify: `server/modules/learning/orchestration.ts`
- Modify: `server/modules/learning/http-logic.ts`
- Modify: `server/modules/learning/service.ts`
- Modify: `server/modules/learning/provider.ts` if provider payload shaping needs capability checks
- Modify: `lib/api/contracts/learning.ts`
- Modify: `supabase/seeds/006_ai_agent_and_binding_registry.sql`
- Modify: `supabase/seeds/007_ai_skill_registry.sql`

**Steps:**
1. Validate `attachmentIds` in `executeLearningMessageRequest`.
2. Load attachments by ids and ensure all belong to the current user.
3. Enforce per-message count rules before any AI invocation.
4. For images:
   - If selected tutor model has `vision`, include `image_url` content parts in the provider user message.
   - Otherwise invoke `learning-vision-translator` and store `visual_summary` / `extracted_text`.
5. For audio:
   - Always invoke `learning-audio-transcriber`.
   - Store `transcript_text`.
   - Append transcript to normalized user context sent to the teaching agent.
6. Store attachment summaries in `conversation_messages.content_json.attachments`.
7. Link attachment rows to the final `conversation_messages.id`.
8. Keep text-only behavior unchanged.
9. Run `pnpm lint` and the existing live learning message tests when credentials are available.

**Acceptance:**
- Text-only messages still work.
- DeepSeek-style text tutor can answer image questions through translator fallback.
- Voice-only messages can produce a normal tutor response after ASR.
- Attachment processing failures produce clear user-facing errors.

## Phase 4: Agent, Model Capability, and Admin AI Support

**Files:**
- Modify: `lib/api/contracts/admin-ai.ts`
- Modify: `features/admin-ai/lib/view-model.ts`
- Modify: `features/admin-ai/components/agent-form-sheet.tsx`
- Modify: `server/modules/admin-ai/service.ts`
- Modify: `supabase/seeds/005_ai_provider_and_model_registry.sql`
- Modify: `supabase/seeds/006_ai_agent_and_binding_registry.sql`
- Modify: `supabase/seeds/007_ai_skill_registry.sql`

**Steps:**
1. Add interaction types `media_vision_extract` and `media_audio_transcribe`.
2. Seed `learning-vision-translator` and `learning-audio-transcriber`.
3. Bind translator agents to models with `vision` and `asr` capabilities.
4. Ensure admin AI forms can display and save the new interaction types and capabilities.
5. Add conservative fallback guidance in agent prompts: extract only observable content, do not invent file details.
6. Run `pnpm lint`.

**Acceptance:**
- Admin AI pages can view and configure the new agent types.
- Seeds are idempotent.
- Missing media-capable model configuration fails with a specific error instead of generic 422.

## Phase 5: Frontend Chat UX

**Files:**
- Modify: `features/learning/components/chat.tsx`
- Modify: `features/learning/types.ts`
- Modify: `features/learning/components/learn-chat-rich-content.tsx` only if message rendering needs shared helpers
- Modify or create focused UI helpers under `features/learning/components/`

**Steps:**
1. Add image picker, paste, and drag-drop support.
2. Add local image preview with remove action.
3. Add audio recording using browser `MediaRecorder`.
4. Upload attachments before message send and block send while uploads are pending.
5. Send `attachmentIds` with the existing message request.
6. Render user message image thumbnails and audio bubble.
7. Render transcript text when available.
8. Handle upload, preprocessing, and AI reply failures with distinct messages.
9. Run `pnpm lint` and a manual `/learn` smoke test.

**Acceptance:**
- User can send image + optional text.
- User can send audio + optional text.
- Existing quick replies and text input behavior are unchanged.
- History pagination can replay user messages with attachment display metadata.

## Phase 6: Documentation and Verification

**Files:**
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
- Modify: `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
- Modify: `docs/plans/README.md`
- Modify: `AGENTS.md`

**Steps:**
1. Update API spec with attachment upload and message `attachmentIds`.
2. Update schema doc with `learning_message_attachments`.
3. Update orchestration doc with deterministic media preprocessing.
4. Update README and AGENTS status summaries only after implementation is actually complete.
5. Run `pnpm lint`.
6. Run any targeted learning message live tests available for the configured environment.

**Acceptance:**
- Docs do not describe planned media support as implemented until matching code and migrations exist.
- Verification commands and any manual test gaps are recorded in the final implementation summary.
