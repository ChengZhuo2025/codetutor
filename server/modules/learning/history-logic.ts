export const DEFAULT_LEARNING_MESSAGES_PAGE_SIZE = 20
export const MAX_LEARNING_MESSAGES_PAGE_SIZE = 50
const PERSISTED_LEARNING_MESSAGE_ID_OFFSET = 1000

export function normalizeLearningMessagesPageSize(limit?: number | null) {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LEARNING_MESSAGES_PAGE_SIZE
  }

  return Math.min(MAX_LEARNING_MESSAGES_PAGE_SIZE, Math.floor(limit))
}

export function buildPersistedLearningMessageId(sequenceNo: number) {
  return PERSISTED_LEARNING_MESSAGE_ID_OFFSET + sequenceNo
}

export function resolveLearningMessagesPage<T extends { sequenceNo: number }>(
  rowsInDescendingSequence: T[],
  pageSize: number,
) {
  const hasMore = rowsInDescendingSequence.length > pageSize
  const pageRows = hasMore
    ? rowsInDescendingSequence.slice(0, pageSize)
    : rowsInDescendingSequence
  const items = [...pageRows].reverse()

  return {
    items,
    hasMore,
    nextBeforeSequenceNo: hasMore ? (items[0]?.sequenceNo ?? null) : null,
  }
}
