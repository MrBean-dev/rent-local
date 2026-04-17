const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export interface Coords { lat: number; lng: number }

export async function geocodeLocation(location: string): Promise<Coords | null> {
  try {
    const query = encodeURIComponent(location)
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${TOKEN}&limit=1&types=place,postcode,locality,neighborhood,address`
    )
    const data = await res.json()
    const [lng, lat] = data.features?.[0]?.center ?? []
    if (lat == null || lng == null) return null
    return { lat, lng }
  } catch {
    return null
  }
}

export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
