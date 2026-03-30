import test from "node:test"

import {
  hydrateProcessEnv,
  runJsonLiveAssertions,
} from "./lib/learning-message-live-helpers.ts"

hydrateProcessEnv()

test(
  "learning message live json integration persists provider and database records",
  { timeout: 120_000 },
  async () => {
    await runJsonLiveAssertions()
  },
)
