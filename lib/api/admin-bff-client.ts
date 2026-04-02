import type { ApiResponse } from "@/lib/api/types"
import { unwrapResponse } from "@/lib/api/types"

const API_BASE_PATH = "/api"

export async function adminBffFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData

  if (
    init?.body
    && typeof init.body === "string"
    && !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json")
  }

  if (isFormData) {
    headers.delete("Content-Type")
  }

  return fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    credentials: "include",
    headers,
    cache: "no-store",
  })
}

export async function adminRequestData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await adminBffFetch(path, init)
  const json = (await response.json()) as ApiResponse<T>
  return unwrapResponse(json)
}
