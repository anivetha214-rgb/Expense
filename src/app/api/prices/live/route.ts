import { NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'
import { getLivePrices } from '@/lib/simulator'
import { CROPS, MARKETS } from '@/lib/seed-data'

export const dynamic = 'force-dynamic'

/**
 * Real-time market tick. Also runs the price-alert engine:
 * every active alert is evaluated against the live price; triggered
 * alerts create notifications (idempotent via triggeredAt flag) which
 * the socket service broadcasts to connected devices.
 */
export async function GET() {
  await ensureServices()
  const t = Date.now()
  const prices = await getLivePrices(t)

  const cropName = new Map(CROPS.map((c) => [c.id, c]))
  const marketName = new Map(MARKETS.map((m) => [m.id, m]))

  const activeAlerts = await db.alert.findMany({
    where: { active: true, triggeredAt: null },
  })

  const triggered: {
    id: string; deviceId: string; title: string; body: string
    cropId: string; marketId: string; price: number
  }[] = []

  for (const alert of activeAlerts) {
    const live = prices.find((p) => p.cropId === alert.cropId && p.marketId === alert.marketId)
    if (!live) continue
    const hit =
      alert.direction === 'ABOVE' ? live.price >= alert.targetPrice : live.price <= alert.targetPrice
    if (!hit) continue

    const crop = cropName.get(alert.cropId)
    const market = marketName.get(alert.marketId)
    const title =
      alert.direction === 'ABOVE'
        ? `${crop?.name ?? alert.cropId} price crossed above ₹${alert.targetPrice}`
        : `${crop?.name ?? alert.cropId} price dropped below ₹${alert.targetPrice}`
    const body = `${crop?.name ?? alert.cropId} is now ₹${live.price}/quintal at ${market?.name ?? alert.marketId} (${market?.district ?? ''}).`
    const titleTa =
      alert.direction === 'ABOVE'
        ? `${crop?.nameTa ?? ''} விலை ₹${alert.targetPrice} க்கு மேல் உயர்ந்தது`
        : `${crop?.nameTa ?? ''} விலை ₹${alert.targetPrice} க்கு கீழே விழுந்தது`
    const bodyTa = `${crop?.nameTa ?? ''} இப்போது ${market?.nameTa ?? ''} இல் ₹${live.price}/குண்டல்.`

    await db.alert.update({
      where: { id: alert.id },
      data: { triggeredAt: new Date(), active: false },
    })
    const [notifEn, notifTa] = await Promise.all([
      db.notification.create({
        data: { deviceId: alert.deviceId, title, body, cropId: alert.cropId, marketId: alert.marketId, price: live.price },
      }),
      db.notification.create({
        data: { deviceId: alert.deviceId, title: titleTa, body: bodyTa, cropId: alert.cropId, marketId: alert.marketId, price: live.price },
      }),
    ])
    triggered.push(notifEn, notifTa)
  }

  return NextResponse.json({ prices, triggered, ts: t })
}
