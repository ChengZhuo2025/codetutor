import type { ApiResponse } from "@/lib/api/types"
import { unwrapResponse } from "@/lib/api/types"

const API_BASE_PATH = "/api"

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  return (await response.json()) as ApiResponse<T>
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
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
