import { describe, it } from "node:test"
import assert from "node:assert"
import { getIpGeocoding, isValidIp } from "@/server/lib/ip-geocoding"

describe("IP Geocoding", () => {
  it("should validate IP addresses correctly", () => {
    assert.strictEqual(isValidIp("223.167.207.253"), true)
    assert.strictEqual(isValidIp("192.168.1.1"), true)
    assert.strictEqual(isValidIp("8.8.8.8"), true)
    assert.strictEqual(isValidIp("invalid"), false)
  })

  it("should get geocoding info for public IP", async () => {
    const result = await getIpGeocoding("223.167.207.253")
    console.log("IP 223.167.207.253 geocoding result:", JSON.stringify(result, null, 2))
    assert.strictEqual(result.ip, "223.167.207.253")
  })

  it("should handle private IP", async () => {
    const result = await getIpGeocoding("192.168.1.1")
    console.log("IP 192.168.1.1 geocoding result:", JSON.stringify(result, null, 2))
    assert.strictEqual(result.ip, "192.168.1.1")
  })
})