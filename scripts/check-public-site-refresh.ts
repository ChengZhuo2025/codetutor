import test from "node:test"
import assert from "node:assert/strict"

import {
  createLatestPublicSiteRequestGate,
  refreshPublicSiteWhenDialogOpens,
} from "../features/site/lib/public-site-refresh.ts"

test("latest public site request gate only allows the newest response to commit", () => {
  const gate = createLatestPublicSiteRequestGate()

  const firstRequest = gate.nextRequestId()
  const secondRequest = gate.nextRequestId()

  assert.equal(gate.shouldCommit(firstRequest), false)
  assert.equal(gate.shouldCommit(secondRequest), true)
})

test("public site dialogs refresh managed content only when opened", async () => {
  let refreshCount = 0

  await refreshPublicSiteWhenDialogOpens(true, async () => {
    refreshCount += 1
  })
  await refreshPublicSiteWhenDialogOpens(false, async () => {
    refreshCount += 1
  })

  assert.equal(refreshCount, 1)
})
