export class LearningAIProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LearningAIProviderError"
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
