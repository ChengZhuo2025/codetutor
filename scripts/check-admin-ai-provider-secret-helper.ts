import test from "node:test"
import assert from "node:assert/strict"

import {
  decryptProviderSecret,
  encryptProviderSecret,
  resolveProviderSecret,
} from "../server/lib/secrets/provider-secret.ts"

test("provider secret helper encrypts and decrypts api keys", () => {
  process.env.AI_PROVIDER_SECRET_ENCRYPTION_KEY = "unit-test-provider-secret-key"

  const encrypted = encryptProviderSecret("sk-live-demo-secret")
  const decrypted = decryptProviderSecret({
    secret_ref: "SILICONFLOW_API_KEY",
    ...encrypted,
  })

  assert.equal(decrypted, "sk-live-demo-secret")
})

test("provider secret helper prefers stored encrypted secret over env fallback", () => {
  process.env.AI_PROVIDER_SECRET_ENCRYPTION_KEY = "unit-test-provider-secret-key"
  process.env.SILICONFLOW_API_KEY = "sk-env-fallback-secret"

  const encrypted = encryptProviderSecret("sk-db-secret")
  const resolved = resolveProviderSecret({
    secret_ref: "SILICONFLOW_API_KEY",
    ...encrypted,
  })

  assert.equal(resolved.source, "database")
  assert.equal(resolved.secret, "sk-db-secret")
})

test("provider secret helper falls back to env when database secret is absent", () => {
  process.env.SILICONFLOW_API_KEY = "sk-env-fallback-secret"

  const resolved = resolveProviderSecret({
    secret_ref: "SILICONFLOW_API_KEY",
    secret_ciphertext: null,
    secret_iv: null,
    secret_auth_tag: null,
    secret_key_version: null,
  })

  assert.equal(resolved.source, "env_fallback")
  assert.equal(resolved.secret, "sk-env-fallback-secret")
})
