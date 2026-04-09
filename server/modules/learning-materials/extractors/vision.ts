import "server-only"

export async function runVisionExtraction() {
  return {
    textBlocks: [] as string[],
    warnings: ["当前版本未接入稳定 vision 总结，已跳过画面理解。"],
  }
}
