import "server-only"

import { createSign, createVerify } from "node:crypto"

export type AlipayParams = Record<string, string>

function stringifyAlipayValue(value: unknown) {
  if (value === undefined || value === null) return ""
  return String(value)
}

export function buildAlipaySignContent(params: Record<string, unknown>) {
  return Object.entries(params)
    .filter(([key, value]) => key !== "sign" && key !== "sign_type" && value !== undefined && value !== null && String(value) !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${stringifyAlipayValue(value)}`)
    .join("&")
}

export function buildAlipaySignedParams(input: {
  params: Record<string, unknown>
  privateKeyPem: string
}) {
  const params = {
    ...input.params,
    sign_type: input.params.sign_type ?? "RSA2",
  }
  const signer = createSign("RSA-SHA256")
  signer.update(buildAlipaySignContent(params), "utf8")
  signer.end()
  return {
    ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, stringifyAlipayValue(value)])),
    sign: signer.sign(input.privateKeyPem).toString("base64"),
  } as AlipayParams
}

export function verifyAlipaySignature(input: {
  params: Record<string, unknown>
  publicKeyPem: string
}) {
  const signature = stringifyAlipayValue(input.params.sign)
  if (!signature) return false
  try {
    const verifier = createVerify("RSA-SHA256")
    verifier.update(buildAlipaySignContent(input.params), "utf8")
    verifier.end()
    return verifier.verify(input.publicKeyPem, signature, "base64")
  } catch {
    return false
  }
}

export function verifyAlipayResponseSignature(input: {
  responsePayload: Record<string, unknown>
  signature: string
  publicKeyPem: string
}) {
  if (!input.signature) return false
  try {
    const verifier = createVerify("RSA-SHA256")
    verifier.update(JSON.stringify(input.responsePayload), "utf8")
    verifier.end()
    return verifier.verify(input.publicKeyPem, input.signature, "base64")
  } catch {
    return false
  }
}
