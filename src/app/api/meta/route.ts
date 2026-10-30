import { NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'
import { CROPS, MARKETS, DISTRICTS, VEHICLES, MARKET_FEE_PCT, HANDLING_PER_QUINTAL } from '@/lib/seed-data'

export const dynamic = 'force-dynamic'

/** Static reference data: crops, markets, districts, vehicles. */
export async function GET() {
  await ensureServices()
  const [crops, markets] = await Promise.all([db.crop.findMany(), db.market.findMany()])
  return NextResponse.json({
    crops: crops.length ? crops : CROPS.map((c) => ({ ...c, months: c.months.join(',') })),
    markets: markets.length ? markets : MARKETS,
    districts: DISTRICTS,
    vehicles: VEHICLES,
    fees: { marketFeePct: MARKET_FEE_PCT, handlingPerQuintal: HANDLING_PER_QUINTAL },
  })
}
