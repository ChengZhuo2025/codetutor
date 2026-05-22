import test from "node:test"
import assert from "node:assert/strict"

import {
  createSafeReadableStreamSender,
  isReadableStreamControllerClosedError,
} from "../server/modules/learning/stream-safety.ts"

test("isReadableStreamControllerClosedError detects closed-controller runtime errors", () => {
  assert.equal(
    isReadableStreamControllerClosedError(new TypeError("Invalid state: Controller is already closed")),
    true,
  )
  assert.equal(isReadableStreamControllerClosedError(new Error("AI provider stream timed out")), false)
})

test("createSafeReadableStreamSender suppresses enqueue and close after controller is closed", () => {
  const sender = createSafeReadableStreamSender({
    enqueue() {
      throw new TypeError("Invalid state: Controller is already closed")
    },
    close() {
      throw new TypeError("Invalid state: Controller is already closed")
    },
  })

  assert.equal(sender.send(new Uint8Array([1, 2, 3])), false)
  assert.equal(sender.isClosed(), true)
  assert.doesNotThrow(() => sender.close())
})
