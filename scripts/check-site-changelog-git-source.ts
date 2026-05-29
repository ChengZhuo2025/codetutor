import test from "node:test"
import assert from "node:assert/strict"

import {
  getCommitRange,
  parseGitLogOutput,
  SiteChangelogGitSourceError,
} from "../server/modules/site-changelog/git-source.ts"

test("parseGitLogOutput maps structured commits and excludes empty subjects", () => {
  const output = [
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\u001faaaaaaa\u001fAlice\u001fa@example.com\u001f2026-05-29T08:00:00+08:00\u001ffeat: add page\u001fbody text",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\u001fbbbbbbb\u001fBob\u001fb@example.com\u001f2026-05-29T09:00:00+08:00\u001f   \u001fignored",
  ].join("\u001e")

  const commits = parseGitLogOutput(output)
  assert.equal(commits.length, 1)
  assert.equal(commits[0]?.sha, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
  assert.equal(commits[0]?.shortSha, "aaaaaaa")
  assert.equal(commits[0]?.body, "body text")
})

test("getCommitRange returns oldest and newest sha from git log order", () => {
  const commits = parseGitLogOutput([
    "newsha\u001fnewsha\u001fAlice\u001fa@example.com\u001f2026-05-29T10:00:00+08:00\u001fnew\u001f",
    "oldsha\u001foldsha\u001fAlice\u001fa@example.com\u001f2026-05-29T08:00:00+08:00\u001fold\u001f",
  ].join("\u001e"))

  assert.deepEqual(getCommitRange(commits), {
    commitFromSha: "oldsha",
    commitToSha: "newsha",
    commitCount: 2,
  })
})

test("SiteChangelogGitSourceError exposes stable business codes", () => {
  assert.equal(new SiteChangelogGitSourceError("NO_COMMITS_FOUND", "无提交").code, "NO_COMMITS_FOUND")
  assert.equal(new SiteChangelogGitSourceError("GIT_SOURCE_UNAVAILABLE", "不可用").code, "GIT_SOURCE_UNAVAILABLE")
})
