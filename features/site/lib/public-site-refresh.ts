export function createLatestPublicSiteRequestGate() {
  let latestRequestId = 0

  return {
    nextRequestId() {
      latestRequestId += 1
      return latestRequestId
    },
    shouldCommit(requestId: number) {
      return requestId === latestRequestId
    },
  }
}

export function refreshPublicSiteWhenDialogOpens(
  open: boolean,
  refreshPublicSite: () => Promise<void>,
) {
  if (!open) return undefined
  return refreshPublicSite()
}
