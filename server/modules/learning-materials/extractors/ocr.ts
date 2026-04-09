import "server-only"

export async function runOcrExtraction() {
  return {
    textBlocks: [] as string[],
    warnings: ["当前版本未接入稳定 OCR，已跳过图片文字识别。"],
  }
}
