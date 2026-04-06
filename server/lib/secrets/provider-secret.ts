import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

export type ProviderSecretRecord = {
  secret_ref: string | null
  secret_ciphertext: string | null
  secret_iv: string | null
  secret_auth_tag: string | null
  secret_key_version: string | null
}

export type ProviderSecretSource = "database" | "env_fallback" | "missing"

export type EncryptedProviderSecret = {
  secret_ciphertext: string
  secret_iv: string
  secret_auth_tag: string
  secret_key_version: string
}

const PROVIDER_SECRET_KEY_VERSION = "v1"
const DATABASE_MASK = "••••••••••"

function getProviderSecretEncryptionKey() {
  const raw = process.env.AI_PROVIDER_SECRET_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("Missing required environment variable: AI_PROVIDER_SECRET_ENCRYPTION_KEY")
  }

  return createHash("sha256").update(raw, "utf8").digest()
}

export function hasStoredProviderSecret(record: ProviderSecretRecord) {
  return Boolean(record.secret_ciphertext && record.secret_iv && record.secret_auth_tag)
}

export function encryptProviderSecret(secret: string): EncryptedProviderSecret {
  const key = getProviderSecretEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ])

  return {
    secret_ciphertext: ciphertext.toString("base64"),
    secret_iv: iv.toString("base64"),
    secret_auth_tag: cipher.getAuthTag().toString("base64"),
    secret_key_version: PROVIDER_SECRET_KEY_VERSION,
  }
}

export function decryptProviderSecret(record: ProviderSecretRecord) {
  if (!hasStoredProviderSecret(record)) {
    return null
  }

  const key = getProviderSecretEncryptionKey()
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(record.secret_iv ?? "", "base64"),
  )

  decipher.setAuthTag(Buffer.from(record.secret_auth_tag ?? "", "base64"))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(record.secret_ciphertext ?? "", "base64")),
    decipher.final(),
  ]).toString("utf8")

  return plaintext
}

export function resolveProviderSecret(record: ProviderSecretRecord): {
  secret: string | null
  source: ProviderSecretSource
} {
  if (hasStoredProviderSecret(record)) {
    return {
      secret: decryptProviderSecret(record),
      source: "database",
    }
  }

  const envSecretRef = record.secret_ref?.trim()
  if (!envSecretRef) {
    return {
      secret: null,
      source: "missing",
    }
  }

  const envSecret = process.env[envSecretRef]
  if (!envSecret) {
    return {
      secret: null,
      source: "missing",
    }
  }

  return {
    secret: envSecret,
    source: "env_fallback",
  }
}

export function maskSecret(secret: string | null) {
  if (!secret) {
    return "未配置"
  }

  if (secret.length <= 8) {
    return "*".repeat(8)
  }

  return `${secret.slice(0, 4)}${"*".repeat(Math.max(4, Math.min(12, secret.length - 8)))}${secret.slice(-4)}`
}

export function getProviderSecretPresentation(record: ProviderSecretRecord): {
  secretSource: ProviderSecretSource
  secretMasked: string
  envSecretRef: string | null
  hasStoredSecret: boolean
} {
  if (hasStoredProviderSecret(record)) {
    return {
      secretSource: "database",
      secretMasked: DATABASE_MASK,
      envSecretRef: record.secret_ref?.trim() || null,
      hasStoredSecret: true,
    }
  }

  const resolved = resolveProviderSecret(record)

  return {
    secretSource: resolved.source,
    secretMasked: resolved.source === "env_fallback" ? maskSecret(resolved.secret) : "未配置",
    envSecretRef: record.secret_ref?.trim() || null,
    hasStoredSecret: false,
  }
}
