import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const meRoute = readFileSync(
  new URL("../app/api/admin/profile/me/route.ts", import.meta.url),
  "utf8",
)
const avatarRoute = readFileSync(
  new URL("../app/api/admin/profile/avatar/route.ts", import.meta.url),
  "utf8",
)

assert.match(
  meRoute,
  /getAdminProfileMe/,
  "The admin profile me route should use the admin-specific profile reader.",
)
assert.match(
  meRoute,
  /updateAdminProfileMe/,
  "The admin profile me route should use the admin-specific profile updater.",
)
assert.doesNotMatch(
  meRoute,
  /import\s*\{\s*getProfileMe,\s*updateProfileMe\s*\}\s*from\s*"@\/server\/modules\/auth\/service"/,
  "The admin profile me route must not import the user profile service pair.",
)

assert.match(
  avatarRoute,
  /uploadAdminProfileAvatar/,
  "The admin profile avatar route should use the admin-specific avatar uploader.",
)
assert.doesNotMatch(
  avatarRoute,
  /import\s*\{\s*uploadProfileAvatar\s*\}\s*from\s*"@\/server\/modules\/auth\/service"/,
  "The admin profile avatar route must not import the user avatar uploader.",
)

console.log("Admin profile routes use the admin-specific profile services.")
