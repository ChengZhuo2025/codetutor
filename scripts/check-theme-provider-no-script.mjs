import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const appProvidersSource = readFileSync(
  new URL("../providers/app-providers.tsx", import.meta.url),
  "utf8",
)

const themeToggleSource = readFileSync(
  new URL("../components/layout/theme-toggle.tsx", import.meta.url),
  "utf8",
)

assert.doesNotMatch(
  `${appProvidersSource}\n${themeToggleSource}`,
  /from ["']next-themes["']/,
  "Theme wiring should not import next-themes because its provider renders an inline script during client rendering.",
)

const themeProviderSource = readFileSync(
  new URL("../providers/theme-provider.tsx", import.meta.url),
  "utf8",
)

assert.doesNotMatch(
  themeProviderSource,
  /<script\b|createElement\(["']script["']/,
  "The local theme provider should not render script tags from React.",
)
