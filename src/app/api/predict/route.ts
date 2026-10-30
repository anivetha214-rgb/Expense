import { NextRequest, NextResponse } from 'next/server'
import { ensureServices, getMlStatus } from '@/lib/ensure-services'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ForecastPoint { date: string; price: number; low: number; high: number }

/**
 * AI price prediction — proxies to the Python Flask + scikit-learn
 * micro-service. If the service is unavailable, a transparent
 * statistical fallback (4-week seasonal average × trend) is returned.
 */
export async function GET(req: NextRequest) {
  await ensureServices()
  const sp = req.nextUrl.searchParams
  const cropId = sp.get('cropId') ?? 'tomato'
  const marketId = sp.get('marketId') ?? 'koyambedu'
  const horizon = Math.min(14, Math.max(3, Number(sp.get('horizon') ?? 7)))

  const ml = await getMlStatus()
  if (ml.status === 'ready') {
    try {
      const res = await fetch(
        `http://127.0.0.1:5001/predict?cropId=${encodeURIComponent(cropId)}&marketId=${encodeURIComponent(marketId)}&horizon=${horizon}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ ...data, engine: 'flask-ml' })
      }
    } catch { /* fall through to fallback */ }
  }

  // ---- statistical fallback ----
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - 60)
  const rows = await db.priceRecord.findMany({
    where: { cropId, marketId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, modalPrice: true },
  })
  if (rows.length < 28) {
    return NextResponse.json({ error: 'not enough data' }, { status: 503 })
  }
  const prices = rows.map((r) => r.modalPrice)
  const last = prices[prices.length - 1]
  // trend: linear slope over last 30 days
  const tail = prices.slice(-30)
  const n = tail.length
  const meanX = (n - 1) / 2
  const meanY = tail.reduce((a, b) => a + b, 0) / n
  const slope =
    tail.reduce((acc, y, x) => acc + (x - meanX) * (y - meanY), 0) /
    tail.reduce((acc, _, x) => acc + (x - meanX) ** 2, 0)
  // seasonal-naive: mean same-weekday price over last 4 weeks
  const weekdayMap = new Map<number, number[]>()
  rows.forEach((r) => {
    const wd = r.date.getUTCDay()
    weekdayMap.set(wd, [...(weekdayMap.get(wd) ?? []), r.modalPrice])
  })
  const points: ForecastPoint[] = []
  let std = Math.sqrt(prices.slice(-30).reduce((a, b) => a + (b - meanY) ** 2, 0) / n)
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(rows[rows.length - 1].date)
    d.setUTCDate(d.getUTCDate() + i)
    const wdAvg = weekdayMap.get(d.getUTCDay())?.reduce((a, b) => a + b, 0) ?? last
    const wdN = weekdayMap.get(d.getUTCDay())?.length ?? 1
    const seasonal = wdAvg / Math.max(1, wdN)
    const pred = Math.round(seasonal * 0.5 + (meanY + slope * (30 / 2 + i)) * 0.5)
    std = std * 1.06
    points.push({
      date: d.toISOString().slice(0, 10),
      price: pred,
      low: Math.round(pred - 1.96 * std),
      high: Math.round(pred + 1.96 * std),
    })
  }
  const trendPct = Math.round(((points[points.length - 1].price - last) / last) * 1000) / 10
  return NextResponse.json({
    cropId, marketId, horizon, current: last, points, trendPct,
    model: { type: 'seasonal-trend (fallback)', mape: null, accuracy: null },
    engine: 'fallback',
  })
}
