import "server-only"

export async function runAsrExtraction() {
  return {
    textBlocks: [] as string[],
    warnings: ["当前版本未接入稳定 ASR，已跳过语音转写。"],
  }
}
