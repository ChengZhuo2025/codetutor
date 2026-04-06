import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  loadAIAgentSkillBindingsSnapshot,
  loadAISkillsSnapshot,
} from "@/server/modules/ai/config-cache"

type AgentSkillBindingRow = {
  agent_code: string
  skill_code: string
  priority: number
  context_budget_tokens: number | null
  is_active: boolean
}

type SkillPackRow = {
  code: string
  name: string
  manifest_path: string
  entry_resource_path: string | null
  is_active: boolean
}

export type SkillContext = {
  code: string
  name: string
  content: string
}

function limitSkillContent(content: string, tokenBudget: number | null) {
  const normalized = content.trim()
  if (!normalized) {
    return ""
  }

  if (!tokenBudget || tokenBudget <= 0) {
    return normalized
  }

  const approxCharBudget = Math.max(400, tokenBudget * 3)
  if (normalized.length <= approxCharBudget) {
    return normalized
  }

  return `${normalized.slice(0, approxCharBudget).trim()}\n\n[skill content truncated]`
}

async function readSkillFile(relativePath: string) {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return readFile(absolutePath, "utf8")
}

export async function loadAgentSkillContexts(
  supabase: SupabaseClient,
  agentCode: string,
): Promise<SkillContext[]> {
  void supabase
  const bindings = (await loadAIAgentSkillBindingsSnapshot<AgentSkillBindingRow>())
    .filter((binding) => binding.agent_code === agentCode && binding.is_active)
    .sort((left, right) => left.priority - right.priority)

  if (bindings.length === 0) {
    return []
  }

  const skillCodes = new Set(bindings.map((binding) => binding.skill_code))
  const skillRows = (await loadAISkillsSnapshot<SkillPackRow>())
    .filter((skill) => skill.is_active && skillCodes.has(skill.code))

  const skillByCode = new Map(
    skillRows.map((row) => [row.code, row]),
  )

  const contexts = await Promise.all(
    bindings.map(async (binding) => {
      const skill = skillByCode.get(binding.skill_code)
      if (!skill) {
        return null
      }

      const primaryPath = skill.entry_resource_path ?? skill.manifest_path

      try {
        const content = await readSkillFile(primaryPath)
        return {
          code: skill.code,
          name: skill.name,
          content: limitSkillContent(content, binding.context_budget_tokens),
        } satisfies SkillContext
      } catch {
        return null
      }
    }),
  )

  return contexts.filter((item): item is SkillContext => Boolean(item))
}
