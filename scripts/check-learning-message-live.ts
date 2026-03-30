import test from "node:test"
import {
  hydrateProcessEnv,
  runJsonLiveAssertions,
  runSseLiveAssertions,
} from "./lib/learning-message-live-helpers.ts"

hydrateProcessEnv()

test(
  "learning message live integration persists provider and database records for json and sse",
  { timeout: 180_000 },
  async () => {
    await runJsonLiveAssertions()
    await runSseLiveAssertions()
  },
)
