export type IpGeoResult = {
  ip: string
  country: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

const IP_GEO_SERVICE_URL = "https://ipapi.co/"

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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${IP_GEO_SERVICE_URL}${encodeURIComponent(ip)}/json/`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        ip,
        country: null,
        region: null,
        city: null,
        latitude: null,
        longitude: null,
      }
    }

    const data = await response.json()

    return {
      ip,
      country: typeof data.country_name === "string" ? data.country_name : null,
      region: typeof data.region === "string" ? data.region : null,
      city: typeof data.city === "string" ? data.city : null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
    }
  } catch {
    return {
      ip,
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    }
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
  if (geo.country && geo.country !== "China") {
    parts.push(geo.country)
  }

  return parts.join(" ") || "未知"
}