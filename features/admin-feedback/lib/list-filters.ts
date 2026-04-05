type AdminFeedbackListQueryInput = {
  statusFilter: string
  typeFilter: string
  priorityFilter: string
  keywordApplied: string
  limit: string
  page: number
  userId?: string
}

export function readAdminFeedbackUserIdFromSearchParams(searchParams: URLSearchParams) {
  const userId = searchParams.get("userId")?.trim()
  return userId && userId.length > 0 ? userId : undefined
}

export function buildAdminFeedbackListQuery(input: AdminFeedbackListQueryInput) {
  const params = new URLSearchParams()

  if (input.statusFilter !== "all") {
    params.append("status", input.statusFilter)
  }

  if (input.typeFilter !== "all") {
    params.append("feedbackType", input.typeFilter)
  }

  if (input.priorityFilter !== "all") {
    params.append("priority", input.priorityFilter)
  }

  if (input.keywordApplied) {
    params.append("keyword", input.keywordApplied)
  }

  if (input.userId) {
    params.append("userId", input.userId)
  }

  params.append("limit", input.limit)
  params.append("page", String(input.page))

  return params
}
