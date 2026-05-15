export class LearningAIProviderError extends Error {
  readonly retryable: boolean

  constructor(message: string, options?: { retryable?: boolean }) {
    super(message)
    this.name = "LearningAIProviderError"
    this.retryable = options?.retryable ?? false
  }
}

export class LearningValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LearningValidationError"
  }
}

export class LearningConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LearningConfigurationError"
  }
}
