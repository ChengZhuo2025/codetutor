export type StageStatus = "done" | "current" | "available" | "locked"

export type StagePitfall = {
  text: string
  isTrap?: boolean
}

export type Stage = {
  id: number
  title: string
  desc: string
  xp: number
  status: StageStatus
  tags: string[]
  keyPoints: string[]
  pitfalls: StagePitfall[]
}

export type ProgressTool = {
  id: string
  label: string
}
