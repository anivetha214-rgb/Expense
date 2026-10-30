import { NextRequest, NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'
import { DISTRICTS } from '@/lib/seed-data'
import { getLivePrices } from '@/lib/simulator'
import { distanceDistrictToMarket, estimateProfitForMarket, ProfitResult } from '@/lib/transport'

export const dynamic = 'force-dynamic'

export interface RankedMarket extends ProfitResult {
  marketId: string
  marketName: string
  marketNameTa: string
  price: number
  rank: number
  recommended: boolean
}

/**
 * POST { cropId, districtId, vehicleId, quantityQuintal }
 * Ranks every market by estimated NET PROFIT: live price × quantity
 * − transport − market fee − spoilage.
 */
export async function POST(req: NextRequest) {
  await ensureServices()
  const body = await req.json().catch(() => null)
  const cropId: string = body?.cropId
  const districtId: string = body?.districtId
  const vehicleId: string = body?.vehicleId ?? 'mini-truck'
  const quantityQuintal: number = Number(body?.quantityQuintal) || 10

  if (!cropId || !districtId) {
    return NextResponse.json({ error: 'cropId and districtId are required' }, { status: 400 })
  }

  const [crop, markets, live] = await Promise.all([
    db.crop.findUnique({ where: { id: cropId } }),
    db.market.findMany(),
    getLivePrices(),
  ])
  const district = DISTRICTS.find((d) => d.id === districtId)
  if (!crop || !district) {
    return NextResponse.json({ error: 'unknown crop or district' }, { status: 404 })
  }

  const liveForCrop = new Map(live.filter((p) => p.cropId === cropId).map((p) => [p.marketId, p]))

  const ranked: RankedMarket[] = markets
    .map((market): RankedMarket => {
      const distanceKm = distanceDistrictToMarket(district, market)
      const price = liveForCrop.get(market.id)?.price ?? crop.basePrice
      const r = estimateProfitForMarket({
        distanceKm,
        quantityQuintal,
        pricePerQuintal: price,
        vehicleId,
        cropSpoilage: crop.spoilage,
      })
      return {
        ...r,
        marketId: market.id,
        marketName: market.name,
        marketNameTa: market.nameTa,
        price,
        rank: 0,
        recommended: false,
      }
    })
    .sort((a, b) => b.netProfit - a.netProfit)
    .map((r, i) => ({ ...r, rank: i + 1, recommended: i === 0 }))

  return NextResponse.json({
    crop: { id: crop.id, name: crop.name, nameTa: crop.nameTa, unit: crop.unit },
    district,
    vehicleId,
    quantityQuintal,
    ranked,
  })
}
