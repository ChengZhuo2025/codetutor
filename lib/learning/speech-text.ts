const MAX_SPEECH_SEGMENT_LENGTH = 90

function stripMarkdownLine(line: string) {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)、]\s+/, "")
    .replace(/^[-*_]{3,}$/, "")
}

export function normalizeSpeechTextForTts(text: string | null | undefined) {
  const withoutCodeBlocks = (text ?? "").replace(/```[\s\S]*?```/g, (block) => {
    const code = block
      .replace(/^```[^\n]*\n?/, "")
      .replace(/```$/, "")
      .trim()
    return code ? `代码片段：${code}` : ""
  })

  return withoutCodeBlocks
    .split(/\n+/)
    .map((line) => stripMarkdownLine(line.trim()))
    .filter(Boolean)
    .join("。")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/#+/g, "")
    .replace(/[*_`~>|[\](){}]/g, "")
    .replace(/-{2,}/g, "。")
    .replace(/\s+/g, " ")
    .replace(/。{2,}/g, "。")
    .trim()
}

export function splitSpeechTextIntoSegments(text: string | null | undefined) {
  const normalized = normalizeSpeechTextForTts(text)
  if (!normalized) {
    return []
  }

  const sentences = normalized
    .split(/(?<=[。！？!?；;])\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
  const segments: string[] = []
  let current = ""

  for (const sentence of sentences.length ? sentences : [normalized]) {
    if (!current) {
      current = sentence
      continue
    }

    if ((current + sentence).length > MAX_SPEECH_SEGMENT_LENGTH) {
      segments.push(current)
      current = sentence
      continue
    }

    current += sentence
  }

  if (current) {
    segments.push(current)
  }

  return segments.flatMap((segment) => {
    if (segment.length <= MAX_SPEECH_SEGMENT_LENGTH * 1.5) {
      return [segment]
    }

    const chunks: string[] = []
    for (let index = 0; index < segment.length; index += MAX_SPEECH_SEGMENT_LENGTH) {
      chunks.push(segment.slice(index, index + MAX_SPEECH_SEGMENT_LENGTH))
    }
    return chunks
  })
}
