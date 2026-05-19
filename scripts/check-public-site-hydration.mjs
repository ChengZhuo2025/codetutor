import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const layoutSource = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
)

const appProvidersSource = readFileSync(
  new URL("../providers/app-providers.tsx", import.meta.url),
  "utf8",
)

const publicSiteProviderSource = readFileSync(
  new URL("../features/site/providers/public-site-provider.tsx", import.meta.url),
  "utf8",
)

assert.match(
  layoutSource,
  /loadPublicSite\(\)/,
  "Root layout should load the public site snapshot on the server.",
)

assert.match(
  layoutSource,
  /<AppProviders initialPublicSite=\{initialPublicSite\}>/,
  "Root layout should pass the server public site snapshot into AppProviders.",
)

assert.match(
  appProvidersSource,
  /initialPublicSite\?: PublicSiteResponseData/,
  "AppProviders should accept the server public site snapshot.",
)

assert.match(
  appProvidersSource,
  /<PublicSiteProvider initialSite=\{initialPublicSite\}>/,
  "AppProviders should forward the server public site snapshot into PublicSiteProvider.",
)

assert.match(
  publicSiteProviderSource,
  /initialSite\?: PublicSiteResponseData/,
  "PublicSiteProvider should accept an initial site snapshot.",
)

assert.match(
  publicSiteProviderSource,
  /useState<PublicSiteResponseData>\(initialSite\)/,
  "PublicSiteProvider should initialize client state from the server site snapshot.",
)
