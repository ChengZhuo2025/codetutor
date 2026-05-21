import type { ApiResponse } from "@/lib/api/types"
import { getSafeSupabaseBrowserSession } from "@/lib/supabase/client"
import { unwrapResponse } from "@/lib/api/types"

const API_BASE_PATH = "/api"

export async function buildRequestHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders)

  if (!headers.has("Content-Type") && headers.get("X-Use-FormData") !== "true") {
    headers.set("Content-Type", "application/json")
  }

  headers.delete("X-Use-FormData")

  if (typeof window !== "undefined") {
    const session = await getSafeSupabaseBrowserSession()

    if (session?.access_token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${session.access_token}`)
    }
  }

  return headers
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
) {
  const headers = await buildRequestHeaders(init?.headers)
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData

  if (isFormData) {
    headers.delete("Content-Type")
  }

  return fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await apiFetch(path, init)

  return (await response.json()) as ApiResponse<T>
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
}

export async function requestData<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await request<T>(path, init)
  return unwrapResponse(response)
}
