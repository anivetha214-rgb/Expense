// FarmPrice AI — deterministic price history generation + idempotent seeding (server only)
import 'server-only'
import { db } from '@/lib/db'
import { CROPS, MARKETS } from '@/lib/seed-data'

// ---- deterministic PRNG (mulberry32) ----
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const HISTORY_DAYS = 730

/**
 * Deterministic synthetic-but-realistic daily modal prices.
 * price(day) = base × marketFactor × seasonal(month) × inflation(t) × AR(1) noise
 */
export function generateSeries(): {
  cropId: string; marketId: string; date: Date
  minPrice: number; maxPrice: number; modalPrice: number
}[] {
  const rows: {
    cropId: string; marketId: string; date: Date
    minPrice: number; maxPrice: number; modalPrice: number
  }[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  for (const crop of CROPS) {
    for (const market of MARKETS) {
      const rnd = mulberry32(hashStr(`${crop.id}:${market.id}:v1`))
      let noise = 0
      // burn-in so the first day is already "in progress"
      for (let i = 0; i < 60; i++) {
        noise = noise * 0.92 + (rnd() - 0.5) * 2 * crop.volatility
      }
      for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
        const date = new Date(today)
        date.setUTCDate(date.getUTCDate() - d)
        const month = date.getUTCMonth() + 1
        const seasonal = crop.months[month - 1]
        const tYears = (HISTORY_DAYS - d) / 365
        const inflation = Math.pow(1.035, tYears) // ~3.5% yearly wholesale inflation
        noise = noise * 0.92 + (rnd() - 0.5) * 2 * crop.volatility
        const supplyShock = rnd() < 0.006 ? 1 + (rnd() - 0.3) * 0.5 : 1
        let modal = crop.basePrice * market.factor * seasonal * inflation * (1 + noise) * supplyShock
        modal = Math.max(crop.basePrice * 0.45, Math.min(crop.basePrice * 2.6, modal))
        const spread = 0.08 + rnd() * 0.10
        const minP = Math.round(modal * (1 - spread))
        const maxP = Math.round(modal * (1 + spread * 1.3))
        rows.push({
          cropId: crop.id,
          marketId: market.id,
          date,
          minPrice: minP,
          maxPrice: maxP,
          modalPrice: Math.round(modal),
        })
      }
    }
  }
  return rows
}

let seeding: Promise<void> | null = null

/** Idempotent: seeds markets/crops and 2 years of prices on first use. */
export async function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const existingCrops = await db.crop.count()
      const existingMarkets = await db.market.count()
      if (existingCrops > 0 && existingMarkets > 0) return

      await db.$transaction([
        db.priceRecord.deleteMany({}),
        db.alert.deleteMany({}),
        db.notification.deleteMany({}),
      ])
      if (existingMarkets === 0) {
        await db.market.createMany({ data: MARKETS.map(({ id, name, nameTa, district, districtTa, lat, lng, factor }) => ({ id, name, nameTa, district, districtTa, lat, lng, factor })) })
      }
      if (existingCrops === 0) {
        await db.crop.createMany({ data: CROPS.map(({ id, name, nameTa, category, basePrice, volatility, spoilage, months }) => ({ id, name, nameTa, category, basePrice, volatility, spoilage, months: months.join(',') })) })
      }

      const rows = generateSeries()
      const BATCH = 4000
      for (let i = 0; i < rows.length; i += BATCH) {
        await db.priceRecord.createMany({ data: rows.slice(i, i + BATCH) })
      }
    })().catch((e) => {
      seeding = null
      throw e
    })
  }
  return seeding
}
