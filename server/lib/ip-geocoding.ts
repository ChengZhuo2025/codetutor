export type IpGeoResult = {
  ip: string
  country: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

const TAOBAO_IP_API = "http://ip.taobao.com/service/getIpInfo.php"
const IPIP_API = "https://api.ipip.net/find?ip="

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

  const result = await tryTaobaoApi(ip)
  if (result.city) {
    return result
  }

  const fallbackResult = await tryIpipApi(ip)
  if (fallbackResult.city) {
    return fallbackResult
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

async function tryTaobaoApi(ip: string): Promise<IpGeoResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${TAOBAO_IP_API}?ip=${encodeURIComponent(ip)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { ip, country: null, region: null, city: null, latitude: null, longitude: null }
    }

    const data = await response.json()

    if (data.code !== 0) {
      return { ip, country: null, region: null, city: null, latitude: null, longitude: null }
    }

    const info = data.data || {}
    return {
      ip,
      country: typeof info.country === "string" ? info.country : null,
      region: typeof info.region === "string" ? info.region : null,
      city: typeof info.city === "string" && info.city !== "内网IP" ? info.city : null,
      latitude: null,
      longitude: null,
    }
  } catch {
    return { ip, country: null, region: null, city: null, latitude: null, longitude: null }
  }
}

async function tryIpipApi(ip: string): Promise<IpGeoResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${IPIP_API}${encodeURIComponent(ip)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { ip, country: null, region: null, city: null, latitude: null, longitude: null }
    }

    const data = await response.json()

    if (!data || typeof data.data !== "object") {
      return { ip, country: null, region: null, city: null, latitude: null, longitude: null }
    }

    const info = data.data
    const location = typeof info.location === "string" ? info.location.split("|") : []

    return {
      ip,
      country: location[0] || null,
      region: location[1] || null,
      city: location[2] || null,
      latitude: typeof info.latitude === "number" ? info.latitude : null,
      longitude: typeof info.longitude === "number" ? info.longitude : null,
    }
  } catch {
    return { ip, country: null, region: null, city: null, latitude: null, longitude: null }
  }
}

export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

export function formatCityDisplay(geo: IpGeoResult): string {
  const parts: string[] = []
  
  if (geo.city) {
    parts.push(geo.city)
  }
  if (geo.region && !parts.includes(geo.region)) {
    parts.push(geo.region)
  }
  if (geo.country && geo.country !== "中国") {
    parts.push(geo.country)
  }

  return parts.join(" ") || "未知"
}