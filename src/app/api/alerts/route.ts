import { NextRequest, NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'
import { CROPS, MARKETS } from '@/lib/seed-data'
import { getLivePrices } from '@/lib/simulator'

export const dynamic = 'force-dynamic'

/** GET ?deviceId=... — list a device's alerts (joined names resolved client-side). */
export async function GET(req: NextRequest) {
  await ensureServices()
  const deviceId = req.nextUrl.searchParams.get('deviceId') ?? ''
  if (!deviceId) return NextResponse.json({ alerts: [] })
  const alerts = await db.alert.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ alerts })
}

/** POST { deviceId, cropId, marketId, targetPrice, direction } — create alert (evaluated immediately). */
export async function POST(req: NextRequest) {
  await ensureServices()
  const body = await req.json().catch(() => null)
  const deviceId: string = body?.deviceId
  const cropId: string = body?.cropId
  const marketId: string = body?.marketId
  const targetPrice: number = Number(body?.targetPrice)
  const direction: 'ABOVE' | 'BELOW' = body?.direction === 'BELOW' ? 'BELOW' : 'ABOVE'
  if (!deviceId || !cropId || !marketId || !Number.isFinite(targetPrice) || targetPrice <= 0) {
    return NextResponse.json({ error: 'deviceId, cropId, marketId, targetPrice are required' }, { status: 400 })
  }

  const alert = await db.alert.create({
    data: { deviceId, cropId, marketId, targetPrice, direction },
  })

  // Evaluate immediately so the farmer gets instant feedback
  const live = await getLivePrices()
  const hit = live.find((p) => p.cropId === cropId && p.marketId === marketId)
  let triggeredNow = false
  if (hit) {
    const conditionMet = direction === 'ABOVE' ? hit.price >= targetPrice : hit.price <= targetPrice
    if (conditionMet) {
      const crop = CROPS.find((c) => c.id === cropId)
      const market = MARKETS.find((m) => m.id === marketId)
      const title =
        direction === 'ABOVE'
          ? `${crop?.name} price is already above ₹${targetPrice}`
          : `${crop?.name} price is already below ₹${targetPrice}`
      const bodyText = `${crop?.name} is now ₹${hit.price}/quintal at ${market?.name}.`
      await db.alert.update({ where: { id: alert.id }, data: { triggeredAt: new Date(), active: false } })
      await db.notification.create({
        data: { deviceId, title, body: bodyText, cropId, marketId, price: hit.price },
      })
      triggeredNow = true
    }
  }

  return NextResponse.json({ alert, triggeredNow })
}
