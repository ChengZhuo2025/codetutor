/**
 * 标准 8-4-4-4-12 十六进制 UUID 字符串（不校验 RFC 版本/变体位）。
 * 过严的版本/变体位正则会把 PostgreSQL `gen_random_uuid()` 在部分环境下的合法值判为非法。
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim())
}

export function normalizeUuid(value: string | null | undefined) {
  return isUuid(value) ? value : null
}
