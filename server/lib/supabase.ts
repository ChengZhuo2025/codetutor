type NullableError = {
  message: string
  details?: string
} | null

type SupabaseQueryResult<T> = {
  data: T
  error: NullableError
}

function isTransientSupabaseFetchError(error: NullableError) {
  if (!error) {
    return false
  }

  const message = `${error.message} ${error.details ?? ""}`
  return (
    message.includes("fetch failed")
    || message.includes("ENOTFOUND")
    || message.includes("ECONNRESET")
    || message.includes("ETIMEDOUT")
    || message.includes("EAI_AGAIN")
  )
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function runSupabaseQueryWithRetry<T>(
  query: () => PromiseLike<SupabaseQueryResult<T>> | SupabaseQueryResult<T>,
  options: {
    context: string
    delaysMs?: number[]
  },
): Promise<SupabaseQueryResult<T>> {
  const delaysMs = options.delaysMs ?? [200, 600, 1_400, 3_000]
  let lastResult: SupabaseQueryResult<T> | null = null

  for (let attempt = 0; attempt <= delaysMs.length; attempt += 1) {
    try {
      const result = await query()
      if (!isTransientSupabaseFetchError(result.error)) {
        return result
      }

      lastResult = result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!isTransientSupabaseFetchError({ message })) {
        throw error
      }

      lastResult = {
        data: null as T,
        error: { message },
      }
    }

    if (attempt < delaysMs.length) {
      await wait(delaysMs[attempt] ?? 0)
    }
  }

  return lastResult ?? {
    data: null as T,
    error: { message: `${options.context}: transient Supabase query failed` },
  }
}

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
