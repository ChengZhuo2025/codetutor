import "server-only"

export type SubtitleTrack = {
  language: string | null
  text: string
}

export function collectSubtitleText(tracks: SubtitleTrack[]) {
  return tracks
    .map((track) => track.text.trim())
    .filter(Boolean)
}
