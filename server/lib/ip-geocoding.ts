export type IpGeoResult = {
  ip: string
  country: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

export async function getIpGeocoding(ip: string): Promise<IpGeoResult> {
  if (!isValidIp(ip)) {
    return {
      ip,
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    }
  }

  const providers = [
    () => fetchIpapiCo(ip),
    () => fetchFreegeoip(ip),
    () => fetchIpify(ip),
    () => fetchIpapiCom(ip),
  ]

  for (const provider of providers) {
    try {
      const result = await provider()
      if (result.city && result.city.trim()) {
        return result
      }
    } catch (e) {
      console.debug(`IP geocoding provider failed:`, e)
    }
  }

  return {
    ip,
    country: null,
    region: null,
    city: null,
    latitude: null,
    longitude: null,
  }
}

async function fetchIpapiCo(ip: string): Promise<IpGeoResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return {
      ip,
      country: typeof data.country_name === "string" ? data.country_name : null,
      region: typeof data.region === "string" ? data.region : null,
      city: typeof data.city === "string" && data.city !== "None" ? data.city : null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
    }
  } catch {
    throw new Error("ipapi.co failed")
  }
}

async function fetchFreegeoip(ip: string): Promise<IpGeoResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`https://freegeoip.app/json/${encodeURIComponent(ip)}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return {
      ip,
      country: typeof data.country_name === "string" ? data.country_name : null,
      region: typeof data.region_name === "string" ? data.region_name : null,
      city: typeof data.city === "string" && data.city !== "" ? data.city : null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
    }
  } catch {
    throw new Error("freegeoip.app failed")
  }
}

async function fetchIpify(ip: string): Promise<IpGeoResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`https://geo.ipify.org/api/v2/country,city?apiKey=at_IhZ4y79y12K0VJ6E74tH9Q7P7n32n&ipAddress=${encodeURIComponent(ip)}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return {
      ip,
      country: data.location?.country || null,
      region: data.location?.region || null,
      city: data.location?.city || null,
      latitude: typeof data.location?.lat === "number" ? data.location.lat : null,
      longitude: typeof data.location?.lng === "number" ? data.location.lng : null,
    }
  } catch {
    throw new Error("ipify failed")
  }
}

async function fetchIpapiCom(ip: string): Promise<IpGeoResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (data.status !== "success") {
      throw new Error(`API error: ${data.message}`)
    }

    return {
      ip,
      country: typeof data.country === "string" ? data.country : null,
      region: typeof data.regionName === "string" ? data.regionName : null,
      city: typeof data.city === "string" ? data.city : null,
      latitude: typeof data.lat === "number" ? data.lat : null,
      longitude: typeof data.lon === "number" ? data.lon : null,
    }
  } catch {
    throw new Error("ip-api.com failed")
  }
}

export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip)
}

export function formatCityDisplay(geo: IpGeoResult): string {
  const parts: string[] = []
  
  if (geo.city) {
    parts.push(geo.city)
  }
  if (geo.region && !parts.includes(geo.region)) {
    parts.push(geo.region)
  }
  if (geo.country && geo.country !== "China" && geo.country !== "中国") {
    parts.push(geo.country)
  }

  return parts.join(" ") || "未知"
}