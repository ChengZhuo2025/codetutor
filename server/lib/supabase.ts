type NullableError = {
  message: string
} | null

export function assertSupabaseSuccess(
  error: NullableError,
  context: string,
) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

export function toIsoDate(input: string | null | undefined) {
  return input ? new Date(input).toISOString() : new Date().toISOString()
}
