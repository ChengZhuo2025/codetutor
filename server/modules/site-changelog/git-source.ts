import "server-only"

import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { promisify } from "node:util"

import type { SiteChangelogCommit } from "@/lib/api/contracts/admin-site"

const execFileAsync = promisify(execFile)
const FIELD_SEPARATOR = "\u001f"
const RECORD_SEPARATOR = "\u001e"
const GIT_LOG_FORMAT = `%H%x1f%h%x1f%an%x1f%ae%x1f%cI%x1f%s%x1f%b%x1e`

export class SiteChangelogGitSourceError extends Error {
  readonly code: "GIT_SOURCE_UNAVAILABLE" | "NO_COMMITS_FOUND"

  constructor(code: SiteChangelogGitSourceError["code"], message: string) {
    super(message)
    this.name = code
    this.code = code
  }
}

export function parseGitLogOutput(output: string): SiteChangelogCommit[] {
  return output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, shortSha, authorName, authorEmail, committedAt, subject, body] = record.split(FIELD_SEPARATOR)
      return {
        sha: sha?.trim() ?? "",
        shortSha: shortSha?.trim() ?? "",
        authorName: authorName?.trim() ?? "",
        authorEmail: authorEmail?.trim() || null,
        committedAt: committedAt?.trim() ?? "",
        subject: subject?.trim() ?? "",
        body: body?.trim() || null,
      }
    })
    .filter((commit) => commit.sha && commit.subject)
}

export function getCommitRange(commits: SiteChangelogCommit[]) {
  return {
    commitFromSha: commits.at(-1)?.sha ?? null,
    commitToSha: commits[0]?.sha ?? null,
    commitCount: commits.length,
  }
}

export async function loadGitCommitsForDate(
  logDate: string,
  options?: {
    cwd?: string
  },
) {
  const cwd = options?.cwd ?? process.cwd()
  if (!existsSync(`${cwd}/.git`)) {
    throw new SiteChangelogGitSourceError(
      "GIT_SOURCE_UNAVAILABLE",
      "当前运行环境没有可读取的 .git 目录，无法从本地提交记录生成更新日志。",
    )
  }

  try {
    const { stdout } = await execFileAsync(
      "git",
      [
        "log",
        `--since=${logDate} 00:00:00`,
        `--until=${logDate} 23:59:59`,
        "--no-merges",
        `--format=${GIT_LOG_FORMAT}`,
      ],
      {
        cwd,
        maxBuffer: 1024 * 1024,
      },
    )
    const commits = parseGitLogOutput(stdout)
    if (commits.length === 0) {
      throw new SiteChangelogGitSourceError(
        "NO_COMMITS_FOUND",
        "指定日期没有可用于生成更新日志的提交。",
      )
    }
    return commits
  } catch (error) {
    if (error instanceof SiteChangelogGitSourceError) {
      throw error
    }
    throw new SiteChangelogGitSourceError(
      "GIT_SOURCE_UNAVAILABLE",
      "当前环境无法执行 git log，请确认部署环境保留 .git 且 git 命令可用。",
    )
  }
}
