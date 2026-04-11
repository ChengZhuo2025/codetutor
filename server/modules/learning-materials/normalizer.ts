import "server-only"

import {
  MATERIAL_PLAN_HIGH_CONFIDENCE_MIN_CHARS,
  MATERIAL_PLAN_HIGH_CONFIDENCE_TARGET_CHARS,
  MATERIAL_PLAN_TOTAL_USEFUL_TARGET_CHARS,
  MATERIAL_PLAN_WEAK_EVIDENCE_HIGH_CONFIDENCE_CHARS,
  MATERIAL_PLAN_WEAK_EVIDENCE_TOTAL_CHARS,
} from "./constants.ts"

export type MaterialChunkModality =
  | "text"
  | "subtitle"
  | "audio_transcript"
  | "image_ocr"
  | "vision_summary"

export type MaterialChunkEvidenceType =
  | "raw_text"
  | "subtitle_track"
  | "asr_transcript"
  | "ocr_text"
  | "vision_summary"

export type MaterialChunkSourceRef = {
  sourceId: string
  url: string
  chunkNo: number
  assetKind?: string
  assetUrl?: string
  trackLanguage?: string | null
  timeRange?: {
    startMs: number
    endMs: number
  }
  frameNo?: number
  region?: string
}

export type MaterialChunk = {
  id: string
  url: string
  excerpt: string
  modality: MaterialChunkModality
  sourceRef: MaterialChunkSourceRef
  evidenceType: MaterialChunkEvidenceType
  confidence: number
}

export type MaterialEvidenceInput = {
  modality: MaterialChunkModality
  evidenceType: MaterialChunkEvidenceType
  content: string
  sourceRef?: Omit<Partial<MaterialChunkSourceRef>, "sourceId" | "url" | "chunkNo">
  confidence?: number
}

export type MaterialEvidenceCoverage = {
  highConfidenceChars: number
  totalUsefulChars: number
  chunkCount: number
  isSufficient: boolean
  isWeakEvidence: boolean
}

const CHUNK_TARGET = 3500

function isHighConfidenceEvidence(
  evidenceType: MaterialChunkEvidenceType,
) {
  return evidenceType === "raw_text" || evidenceType === "subtitle_track"
}

function defaultConfidence(
  evidenceType: MaterialChunkEvidenceType,
) {
  switch (evidenceType) {
    case "raw_text":
      return 0.98
    case "subtitle_track":
      return 0.92
    case "asr_transcript":
      return 0.75
    case "ocr_text":
      return 0.68
    case "vision_summary":
      return 0.55
  }
}

export function evaluateMaterialEvidenceCoverage(
  chunks: Array<Pick<MaterialChunk, "excerpt" | "evidenceType">>,
): MaterialEvidenceCoverage {
  const highConfidenceChars = chunks.reduce((total, chunk) => (
    total + (isHighConfidenceEvidence(chunk.evidenceType) ? chunk.excerpt.length : 0)
  ), 0)
  const totalUsefulChars = chunks.reduce((total, chunk) => total + chunk.excerpt.length, 0)
  const chunkCount = chunks.length
  const isSufficient =
    highConfidenceChars >= MATERIAL_PLAN_HIGH_CONFIDENCE_TARGET_CHARS
    || (highConfidenceChars >= MATERIAL_PLAN_HIGH_CONFIDENCE_MIN_CHARS && chunkCount >= 2)
    || totalUsefulChars >= MATERIAL_PLAN_TOTAL_USEFUL_TARGET_CHARS
  const isWeakEvidence =
    highConfidenceChars < MATERIAL_PLAN_WEAK_EVIDENCE_HIGH_CONFIDENCE_CHARS
    && totalUsefulChars < MATERIAL_PLAN_WEAK_EVIDENCE_TOTAL_CHARS

  return {
    highConfidenceChars,
    totalUsefulChars,
    chunkCount,
    isSufficient,
    isWeakEvidence,
  }
}

export function buildChunksFromEvidence(
  url: string,
  urlIndex: number,
  sourceId: string,
  evidence: MaterialEvidenceInput[],
): MaterialChunk[] {
  const chunks: MaterialChunk[] = []
  let chunkNo = 0

  for (const item of evidence) {
    const trimmed = item.content.trim()
    if (!trimmed) {
      continue
    }

    let offset = 0
    let part = 0
    while (offset < trimmed.length) {
      const excerpt = trimmed.slice(offset, offset + CHUNK_TARGET)
      chunks.push({
        id: `u${urlIndex}-${item.evidenceType}-${chunkNo}-${part}`,
        url,
        excerpt,
        modality: item.modality,
        evidenceType: item.evidenceType,
        confidence: item.confidence ?? defaultConfidence(item.evidenceType),
        sourceRef: {
          sourceId,
          url,
          chunkNo,
          ...item.sourceRef,
        },
      })
      offset += CHUNK_TARGET
      part += 1
      chunkNo += 1
    }
  }

  return chunks
}

export function summarizeChunks(chunks: MaterialChunk[]) {
  const totalChars = chunks.reduce((n, c) => n + c.excerpt.length, 0)
  return `共 ${chunks.length} 段材料，约 ${totalChars} 字`
}
