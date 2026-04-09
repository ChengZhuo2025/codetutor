import "server-only"

import { MATERIAL_PLAN_MIN_TOTAL_CHARS } from "./constants.ts"
import { materialInsufficientContent } from "./errors.ts"

export type MaterialChunk = {
  id: string
  url: string
  excerpt: string
  modality: "text"
  sourceRef: {
    sourceId: string
    url: string
    chunkNo: number
  }
  evidenceType: "raw_text"
  confidence: number
}

const CHUNK_TARGET = 3500

export function buildChunks(
  url: string,
  text: string,
  urlIndex: number,
  sourceId: string,
): MaterialChunk[] {
  const trimmed = text.trim()
  if (trimmed.length < MATERIAL_PLAN_MIN_TOTAL_CHARS) {
    throw materialInsufficientContent()
  }

  const chunks: MaterialChunk[] = []
  let offset = 0
  let part = 0
  while (offset < trimmed.length) {
    const slice = trimmed.slice(offset, offset + CHUNK_TARGET)
    chunks.push({
      id: `u${urlIndex}-chunk-${part}`,
      url,
      excerpt: slice,
      modality: "text",
      sourceRef: {
        sourceId,
        url,
        chunkNo: part,
      },
      evidenceType: "raw_text",
      confidence: 1,
    })
    offset += CHUNK_TARGET
    part += 1
  }

  return chunks
}

export function summarizeChunks(chunks: MaterialChunk[]) {
  const totalChars = chunks.reduce((n, c) => n + c.excerpt.length, 0)
  return `共 ${chunks.length} 段材料，约 ${totalChars} 字`
}
