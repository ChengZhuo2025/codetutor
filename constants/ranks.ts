export const RANK_DEFINITIONS = [
  {
    code: "rookie",
    name: "萌新码农",
    minScore: 0,
    maxScore: 200,
  },
  {
    code: "apprentice",
    name: "AI 学徒",
    minScore: 200,
    maxScore: 500,
  },
  {
    code: "vibe_coder",
    name: "Vibe Coder",
    minScore: 500,
    maxScore: 1000,
  },
  {
    code: "builder",
    name: "AI 建造者",
    minScore: 1000,
    maxScore: 2000,
  },
  {
    code: "master",
    name: "AI 编程大师",
    minScore: 2000,
    maxScore: 9999,
  },
] as const

export type RankCode = (typeof RANK_DEFINITIONS)[number]["code"]
export type RankDefinition = (typeof RANK_DEFINITIONS)[number]

export const RANK_ORDER = RANK_DEFINITIONS.map((rank) => rank.code) as RankCode[]

export const RANK_NAME_MAP = RANK_DEFINITIONS.reduce(
  (result, rank) => {
    result[rank.code] = rank.name
    return result
  },
  {} as Record<RankCode, string>,
)

export const RANK_MIN_SCORE_MAP = RANK_DEFINITIONS.reduce(
  (result, rank) => {
    result[rank.code] = rank.minScore
    return result
  },
  {} as Record<RankCode, number>,
)

export function getRankDefinition(code: string) {
  return RANK_DEFINITIONS.find((rank) => rank.code === code) ?? null
}

export function getRankName(code: string) {
  return getRankDefinition(code)?.name ?? code
}

export function getNextRankDefinition(code: string) {
  const currentIndex = RANK_ORDER.indexOf(code as RankCode)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0

  return RANK_DEFINITIONS[Math.min(safeIndex + 1, RANK_DEFINITIONS.length - 1)]
}

export function getRemainingXpToNextRank(code: string, currentScore: number) {
  const nextRank = getNextRankDefinition(code)

  if (nextRank.code === code) {
    return 0
  }

  return Math.max(0, nextRank.minScore - currentScore)
}
