// FarmPrice AI — deterministic live price simulator (server only)
// Every client sees identical prices: the "live" price is a pure function of time.
import 'server-only'
import { db } from '@/lib/db'
import { CROPS, MARKETS } from '@/lib/seed-data'

export interface LivePrice {
  cropId: string
  marketId: string
  price: number
  base: number // yesterday's official closing modal price
  changePct: number // vs yesterday close
  ts: number
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// smooth deterministic pseudo-noise in [-1, 1]
function wave(t: number, periodMs: number, phase: number): number {
  return Math.sin((2 * Math.PI * t) / periodMs + phase)
}

/**
 * Intraday live price: yesterday's close × smooth multi-frequency waves
 * (periods ≈ 3h / 47min) + a small jitter re-rolled every 10 s bucket.
 * Range is clamped to ±6% of the previous close.
 */
export function livePriceOf(cropId: string, marketId: string, base: number, t = Date.now()): number {
  const h = hashStr(`${cropId}:${marketId}`)
  const p1 = (h % 1000) / 159.15
  const p2 = ((h >> 10) % 1000) / 159.15
  const jitterBucket = Math.floor(t / 10000)
  const jr = ((hashStr(`${cropId}:${marketId}:${jitterBucket}`) % 2000) - 1000) / 1000 // [-1, 1]
  const drift = 0.014 * wave(t, 3 * 3600_000, p1) + 0.009 * wave(t, 47 * 60_000, p2)
  const jitter = 0.004 * jr
  const total = Math.max(-0.06, Math.min(0.06, drift + jitter))
  return Math.round(base * (1 + total))
}

/** Base = most recent historical modal price per crop×market (yesterday's close). */
export async function getBasePrices(): Promise<Map<string, number>> {
  const latest = await db.priceRecord.findMany({
    orderBy: { date: 'desc' },
    take: CROPS.length * MARKETS.length,
    select: { cropId: true, marketId: true, modalPrice: true, date: true },
  })
  // find max date, then keep rows of that date only
  if (latest.length === 0) return new Map()
  const maxDate = latest.reduce((m, r) => (r.date > m ? r.date : m), latest[0].date)
  const map = new Map<string, number>()
  for (const r of latest) {
    if (r.date.getTime() === maxDate.getTime()) map.set(`${r.cropId}:${r.marketId}`, r.modalPrice)
  }
  return map
}

export async function getLivePrices(t = Date.now()): Promise<LivePrice[]> {
  const bases = await getBasePrices()
  const out: LivePrice[] = []
  for (const crop of CROPS) {
    for (const market of MARKETS) {
      const base = bases.get(`${crop.id}:${market.id}`)
      if (!base) continue
      const price = livePriceOf(crop.id, market.id, base, t)
      out.push({
        cropId: crop.id,
        marketId: market.id,
        price,
        base,
        changePct: Math.round(((price - base) / base) * 1000) / 10,
        ts: t,
      })
    }
  }
  return out
}
