import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, "..")

const appProvidersSource = readFileSync(path.join(repoRoot, "providers/app-providers.tsx"), "utf8")
const dialogSource = readFileSync(path.join(repoRoot, "components/ui/dialog.tsx"), "utf8")
const sheetSource = readFileSync(path.join(repoRoot, "components/ui/sheet.tsx"), "utf8")
const surfaceStylesSource = readFileSync(path.join(repoRoot, "components/ui/surface-styles.ts"), "utf8")
const notificationDialogSource = readFileSync(
  path.join(repoRoot, "components/layout/notification-settings-dialog.tsx"),
  "utf8",
)
const profileEditDialogSource = readFileSync(
  path.join(repoRoot, "components/layout/profile-edit-dialog.tsx"),
  "utf8",
)
const feedbackDialogSource = readFileSync(
  path.join(repoRoot, "components/layout/feedback-dialog.tsx"),
  "utf8",
)
const subscriptionDialogSource = readFileSync(
  path.join(repoRoot, "components/layout/subscription-detail-dialog.tsx"),
  "utf8",
)
const aboutDialogSource = readFileSync(
  path.join(repoRoot, "features/marketing/components/about-dialog.tsx"),
  "utf8",
)
const contactDialogSource = readFileSync(
  path.join(repoRoot, "features/marketing/components/contact-dialog.tsx"),
  "utf8",
)
const adminAccountMenuSource = readFileSync(
  path.join(repoRoot, "features/admin-shell/components/admin-account-menu.tsx"),
  "utf8",
)
const settingsPopoverSource = readFileSync(
  path.join(repoRoot, "components/layout/settings-popover.tsx"),
  "utf8",
)
const timePickerSource = readFileSync(
  path.join(repoRoot, "components/ui/time-picker.tsx"),
  "utf8",
)

const CODE_DIRECTORIES = ["app", "components", "features", "providers", "lib"]
const CODE_FILE_PATTERN = /\.(ts|tsx|js|jsx)$/

function collectCodeFiles(directoryPath) {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      return collectCodeFiles(absolutePath)
    }

    return CODE_FILE_PATTERN.test(entry.name) ? [absolutePath] : []
  })
}

const codeFiles = CODE_DIRECTORIES.flatMap((directory) => (
  collectCodeFiles(path.join(repoRoot, directory))
))

assert.match(
  appProvidersSource,
  /<AppToastProvider>/,
  "AppProviders should mount the global app toast provider",
)

assert.match(
  appProvidersSource,
  /<AppConfirmProvider>/,
  "AppProviders should mount the global app confirm provider",
)

assert.match(
  dialogSource,
  /bg-black\/35.*backdrop-blur/s,
  "Dialog overlay should use a lighter dimming layer with backdrop blur",
)

assert.match(
  dialogSource,
  /bg-background\/96.*backdrop-blur-xl.*shadow-\[0_32px_80px_-40px_rgba\(15,23,42,0\.45\)\]/s,
  "Dialog content should provide a stronger shared modal surface style",
)

assert.match(
  surfaceStylesSource,
  /export const DIALOG_DARK_PANEL_CLASS =/,
  "Surface styles should export a shared dark dialog panel class",
)

assert.match(
  surfaceStylesSource,
  /export const DIALOG_DARK_GRADIENT_PANEL_CLASS =/,
  "Surface styles should export a shared dark gradient dialog panel class",
)

assert.match(
  sheetSource,
  /bg-black\/35.*backdrop-blur/s,
  "Sheet overlay should use a lighter dimming layer with backdrop blur",
)

assert.match(
  sheetSource,
  /bg-background\/96.*backdrop-blur-xl.*shadow-\[0_32px_80px_-40px_rgba\(15,23,42,0\.45\)\]/s,
  "Sheet content should provide a stronger shared drawer surface style",
)

for (const source of [notificationDialogSource, profileEditDialogSource, feedbackDialogSource]) {
  assert.match(
    source,
    /DIALOG_DARK_PANEL_CLASS/,
    "Dark neutral dialogs should reuse the shared dark panel class",
  )
}

for (const source of [subscriptionDialogSource, aboutDialogSource, contactDialogSource]) {
  assert.match(
    source,
    /DIALOG_DARK_GRADIENT_PANEL_CLASS/,
    "Dark gradient dialogs should reuse the shared gradient panel class",
  )
}

assert.match(
  surfaceStylesSource,
  /export const FLOATING_DARK_PANEL_CLASS =/,
  "Surface styles should export a shared dark floating panel class",
)

assert.match(
  surfaceStylesSource,
  /export const FLOATING_LIGHT_PANEL_CLASS =/,
  "Surface styles should export a shared light floating panel class",
)

assert.match(
  settingsPopoverSource,
  /FLOATING_DARK_PANEL_CLASS/,
  "Settings popover should reuse the shared floating panel class",
)

assert.match(
  timePickerSource,
  /FLOATING_DARK_PANEL_CLASS/,
  "Time picker should reuse the shared floating panel class",
)

assert.match(
  adminAccountMenuSource,
  /FLOATING_LIGHT_PANEL_CLASS/,
  "Admin account menu should reuse the shared light floating panel class",
)

for (const absolutePath of codeFiles) {
  const source = readFileSync(absolutePath, "utf8")
  assert.doesNotMatch(
    source,
    /window\.(alert|confirm|prompt)/,
    `${absolutePath} should not rely on native browser popups`,
  )
}

console.log("Global feedback UI uses custom providers, unified overlays, and repo-wide native browser popups are blocked.")
