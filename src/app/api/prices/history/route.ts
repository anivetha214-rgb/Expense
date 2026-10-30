import { NextRequest, NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Historical daily prices. ?cropId=&marketId=&days=30 (marketId optional = all markets). */
export async function GET(req: NextRequest) {
  await ensureServices()
  const sp = req.nextUrl.searchParams
  const cropId = sp.get('cropId') ?? 'tomato'
  const marketId = sp.get('marketId') ?? undefined
  const days = Math.min(365, Math.max(7, Number(sp.get('days') ?? 30)))
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - days)

  const records = await db.priceRecord.findMany({
    where: { cropId, ...(marketId ? { marketId } : {}), date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { cropId: true, marketId: true, date: true, minPrice: true, maxPrice: true, modalPrice: true },
  })

  return NextResponse.json({ records })
}
