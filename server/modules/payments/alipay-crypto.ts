import "server-only"

import { createSign, createVerify } from "node:crypto"

export type AlipayParams = Record<string, string>

function stringifyAlipayValue(value: unknown) {
  if (value === undefined || value === null) return ""
  return String(value)
}

export function buildAlipaySignContent(
  params: Record<string, unknown>,
  options: { excludeSignType?: boolean } = {},
) {
  return Object.entries(params)
    .filter(([key, value]) => {
      if (key === "sign") return false
      if (options.excludeSignType && key === "sign_type") return false
      return value !== undefined && value !== null && String(value) !== ""
    })
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
    verifier.update(buildAlipaySignContent(input.params, { excludeSignType: true }), "utf8")
    verifier.end()
    return verifier.verify(input.publicKeyPem, signature, "base64")
  } catch {
    return false
  }
}

export function extractAlipayResponseRawSegment(rawBody: string, method: string): string | null {
  if (!rawBody) return null
  const responseKey = `${method.replaceAll(".", "_")}_response`
  for (const key of [responseKey, "error_response"]) {
    const marker = `"${key}":`
    const keyIndex = rawBody.indexOf(marker)
    if (keyIndex < 0) continue
    const start = keyIndex + marker.length
    const signMarker = rawBody.lastIndexOf(',"sign":')
    if (signMarker > start) return rawBody.slice(start, signMarker)
    const signMarkerFallback = rawBody.lastIndexOf(',"sign_type":')
    if (signMarkerFallback > start) return rawBody.slice(start, signMarkerFallback)
  }
  return null
}

export function verifyAlipayResponseSignature(input: {
  rawSegment: string
  signature: string
  publicKeyPem: string
}) {
  if (!input.signature || !input.rawSegment) return false
  try {
    const verifier = createVerify("RSA-SHA256")
    verifier.update(input.rawSegment, "utf8")
    verifier.end()
    return verifier.verify(input.publicKeyPem, input.signature, "base64")
  } catch {
    return false
  }
}
