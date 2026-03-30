import test from "node:test"

import {
  hydrateProcessEnv,
  runSseLiveAssertions,
} from "./lib/learning-message-live-helpers.ts"

hydrateProcessEnv()

test(
  "learning message live sse integration persists provider and database records",
  { timeout: 120_000 },
  async () => {
    await runSseLiveAssertions()
  },
)
