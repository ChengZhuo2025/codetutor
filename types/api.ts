export type ViewStateStatus = "loading" | "empty" | "error" | "success" | "warning"

export type ApiRequestState<T> =
  | {
      status: "loading"
      data?: undefined
      message?: string
    }
  | {
      status: "empty"
      data?: undefined
      message?: string
    }
  | {
      status: "error"
      data?: undefined
      message: string
    }
  | {
      status: "success"
      data: T
      message?: string
    }
