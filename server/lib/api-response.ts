import { NextResponse } from "next/server"
import type {
  ApiCode,
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/lib/api/types"

export function ok<T>(
  data: T,
  message = "success",
  init?: ResponseInit,
) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      code: "OK",
      message,
      data,
    },
    init,
  )
}

export function fail(
  code: Exclude<ApiCode, "OK">,
  message: string,
  status: number,
  init?: ResponseInit,
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      code,
      message,
      data: null,
    },
    {
      status,
      ...init,
    },
  )
}
