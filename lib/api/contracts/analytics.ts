import type { AppEventName } from "@/constants/events"

export type AnalyticsEventProperties = Record<string, unknown>

export type AnalyticsTrackEventRequest = {
  eventName: AppEventName
  pagePath?: string | null
  properties?: AnalyticsEventProperties
  occurredAt?: string | null
}

export type AnalyticsTrackEventResponseData = {
  eventId: string
  accepted: true
}

export type AnalyticsAggregateBucket = {
  key: string
  count: number
}

export type AnalyticsDailyTrendPoint = {
  date: string
  count: number
  uniqueUsers: number
}

export type AnalyticsAggregateSummary = {
  totalEvents: number
  uniqueUsers: number
  byEventName: AnalyticsAggregateBucket[]
  byPagePath: AnalyticsAggregateBucket[]
  dailyTrend: AnalyticsDailyTrendPoint[]
}
