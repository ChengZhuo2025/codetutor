import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const source = readFileSync(
  new URL("../features/admin-shell/components/admin-profile-edit-dialog.tsx", import.meta.url),
  "utf8",
)

assert.match(
  source,
  /"\/admin\/profile\/me"/,
  "The admin profile edit dialog should call the admin profile me API.",
)

assert.match(
  source,
  /"\/admin\/profile\/avatar"/,
  "The admin profile edit dialog should call the admin profile avatar API.",
)

assert.doesNotMatch(
  source,
  /adminRequestData<ProfileMeResponseData>\(\s*"\/profile\/me"/,
  "The admin profile edit dialog must not call the user profile me API.",
)

assert.doesNotMatch(
  source,
  /adminRequestData<UploadProfileAvatarResponseData>\(\s*"\/profile\/avatar"/,
  "The admin profile edit dialog must not call the user profile avatar API.",
)

console.log("Admin profile edit dialog uses the admin profile APIs.")
