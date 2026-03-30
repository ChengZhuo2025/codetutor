export type CheckinDailyResponseData = {
  checkedIn: boolean
  alreadyCheckedIn: boolean
  checkinDate: string
  scoreDelta: number
  streakDays: number
  currentScore: number
  currentRank: string
  rankChanged: boolean
}
