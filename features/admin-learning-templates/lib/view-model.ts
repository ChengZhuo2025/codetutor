export const learningTemplateLevelOptions = [
  { value: "beginner", label: "零基础" },
  { value: "intermediate", label: "有基础" },
  { value: "advanced", label: "进阶提升" },
] as const

export function formatTemplateDateTime(iso: string | null) {
  if (!iso) {
    return "暂无"
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function getLevelLabel(level: string) {
  return learningTemplateLevelOptions.find((item) => item.value === level)?.label ?? level
}

export function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function joinLines(value: string[]) {
  return value.join("\n")
}
