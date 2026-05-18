import { getIpGeocoding, isValidIp } from "../server/lib/ip-geocoding.ts"

const testIps = [
  "223.167.207.253",
  "192.168.1.1",
  "8.8.8.8",
]

async function runTest() {
  console.log("Testing IP geocoding...\n")
  
  for (const ip of testIps) {
    console.log(`Testing IP: ${ip}`)
    console.log(`Valid IP: ${isValidIp(ip)}`)
    
    const result = await getIpGeocoding(ip)
    console.log(`Result:`, JSON.stringify(result, null, 2))
    console.log("---")
  }
}

runTest().catch(console.error)