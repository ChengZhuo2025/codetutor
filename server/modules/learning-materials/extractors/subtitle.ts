import "server-only"

import type { MaterialEvidenceInput } from "../normalizer.ts"

export type SubtitleTrack = {
  language: string | null
  text: string
}

export function extractSubtitleEvidence(
  tracks: SubtitleTrack[],
): MaterialEvidenceInput[] {
  return tracks
    .map((track) => ({
      modality: "subtitle" as const,
      evidenceType: "subtitle_track" as const,
      content: track.text.trim(),
      confidence: 0.92,
      sourceRef: {
        assetKind: "subtitle",
        trackLanguage: track.language,
      },
    }))
    .filter((item) => item.content.length > 0)
}
