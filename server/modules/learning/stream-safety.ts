export function isReadableStreamControllerClosedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return /controller is already closed|readablestreamdefaultcontroller is not attached/i.test(
    error.message,
  )
}

export function createSafeReadableStreamSender(
  controller: Pick<ReadableStreamDefaultController<Uint8Array>, "enqueue" | "close">,
) {
  let closed = false

  return {
    send(chunk: Uint8Array) {
      if (closed) {
        return false
      }

      try {
        controller.enqueue(chunk)
        return true
      } catch (error) {
        if (isReadableStreamControllerClosedError(error)) {
          closed = true
          return false
        }

        throw error
      }
    },
    close() {
      if (closed) {
        return
      }

      try {
        controller.close()
      } catch (error) {
        if (!isReadableStreamControllerClosedError(error)) {
          throw error
        }
      } finally {
        closed = true
      }
    },
    isClosed() {
      return closed
    },
  }
}
