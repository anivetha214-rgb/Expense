// Shared geo utilities (safe for client & server)

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Approximate Tamil Nadu road distance between two coordinates. */
export function roadDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  roadFactor = 1.28,
): number {
  return Math.max(4, Math.round(haversineKm(lat1, lng1, lat2, lng2) * roadFactor))
}
