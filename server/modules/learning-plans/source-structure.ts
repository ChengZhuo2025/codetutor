import "server-only"

import type { MaterialChunk } from "@/server/modules/learning-materials/normalizer.ts"

export type PlannerSourceStructure = {
  numberedItemCount: number | null
  minimumTaskCount: number | null
  numberedItemsPreview: string[]
}

const NUMBERED_ITEM_PATTERN = /(?<!\d)(\d{1,2})[、.．]\s*([^\d\n#]{1,80})/g
const MIN_NUMBERED_ITEM_COUNT = 6

function normalizeLabel(raw: string) {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[；;。,.，]+$/g, "")
    .trim()
}

function readConsecutiveNumberedItems(text: string) {
  const items = new Map<number, string>()

  for (const match of text.matchAll(NUMBERED_ITEM_PATTERN)) {
    const itemNo = Number.parseInt(match[1] ?? "", 10)
    const label = normalizeLabel(match[2] ?? "")
    if (!Number.isInteger(itemNo) || itemNo < 1 || itemNo > 30 || label.length === 0) {
      continue
    }

    if (!items.has(itemNo)) {
      items.set(itemNo, label)
    }
  }

  const ordered: Array<{ no: number; label: string }> = []
  for (let expected = 1; items.has(expected); expected += 1) {
    const label = items.get(expected)
    if (!label) {
      break
    }
    ordered.push({ no: expected, label })
  }

  return ordered
}

export function analyzePlannerSourceStructure(
  chunks: Array<Pick<MaterialChunk, "excerpt">>,
): PlannerSourceStructure {
  let longestSequence: Array<{ no: number; label: string }> = []

  for (const chunk of chunks) {
    const orderedItems = readConsecutiveNumberedItems(chunk.excerpt)
    if (orderedItems.length > longestSequence.length) {
      longestSequence = orderedItems
    }
  }

  if (longestSequence.length < MIN_NUMBERED_ITEM_COUNT) {
    return {
      numberedItemCount: null,
      minimumTaskCount: null,
      numberedItemsPreview: [],
    }
  }

  return {
    numberedItemCount: longestSequence.length,
    minimumTaskCount: Math.min(8, Math.max(3, Math.ceil(longestSequence.length / 3))),
    numberedItemsPreview: longestSequence
      .slice(0, 6)
      .map((item) => `${item.no}. ${item.label}`),
  }
}
