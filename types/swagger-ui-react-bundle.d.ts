type SwaggerUiSystem = {
  destroy?: () => void
}

type SwaggerUiBundle = ((options: Record<string, unknown>) => SwaggerUiSystem | void) & {
  presets?: {
    apis?: unknown
  }
}

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUiBundle
  }
}

export {}
