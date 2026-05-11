import "server-only"

import {
  createDecipheriv,
  createSign,
  createVerify,
  randomBytes,
} from "node:crypto"

export type WechatPayAuthorizationInput = {
  method: string
  pathWithQuery: string
  body: string
  mchid: string
  serialNo: string
  privateKeyPem: string
  nonce?: string
  timestamp?: string
}

export function buildWechatPayRequestMessage(input: {
  method: string
  pathWithQuery: string
  timestamp: string
  nonce: string
  body: string
}) {
  return [
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.timestamp,
    input.nonce,
    input.body,
  ].join("\n") + "\n"
}

export function buildWechatPayAuthorizationHeader(input: WechatPayAuthorizationInput) {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000).toString()
  const nonce = input.nonce ?? randomBytes(16).toString("hex")
  const signer = createSign("RSA-SHA256")
  signer.update(buildWechatPayRequestMessage({
    method: input.method,
    pathWithQuery: input.pathWithQuery,
    timestamp,
    nonce,
    body: input.body,
  }))
  signer.end()
  const signature = signer.sign(input.privateKeyPem).toString("base64")

  return `WECHATPAY2-SHA256-RSA2048 ${[
    `mchid="${input.mchid}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${input.serialNo}"`,
  ].join(",")}`
}

export function buildWechatPayResponseMessage(input: {
  timestamp: string
  nonce: string
  body: string
}) {
  return `${input.timestamp}\n${input.nonce}\n${input.body}\n`
}

export function verifyWechatPaySignature(input: {
  publicKeyPem: string
  timestamp: string
  nonce: string
  body: string
  signature: string
}) {
  try {
    const verifier = createVerify("RSA-SHA256")
    verifier.update(buildWechatPayResponseMessage(input))
    verifier.end()
    return verifier.verify(input.publicKeyPem, input.signature, "base64")
  } catch {
    return false
  }
}

export function decryptWechatPayResource(input: {
  apiV3Key: string
  associatedData: string
  nonce: string
  ciphertext: string
}) {
  const key = Buffer.from(input.apiV3Key, "utf8")
  if (key.length !== 32) {
    throw new Error("APIv3 密钥必须是 32 字节。")
  }

  const ciphertext = Buffer.from(input.ciphertext, "base64")
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16)
  const authTag = ciphertext.subarray(ciphertext.length - 16)
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(input.nonce, "utf8"))
  decipher.setAAD(Buffer.from(input.associatedData, "utf8"))
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8")

  return JSON.parse(plaintext) as Record<string, unknown>
}
