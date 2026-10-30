import { NextRequest, NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET ?deviceId=&lang=en|ta — notifications feed (title/body chosen by language). */
export async function GET(req: NextRequest) {
  await ensureServices()
  const sp = req.nextUrl.searchParams
  const deviceId = sp.get('deviceId') ?? ''
  const lang = sp.get('lang') === 'ta' ? 'ta' : 'en'
  if (!deviceId) return NextResponse.json({ notifications: [], unread: 0 })

  const all = await db.notification.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  // pair EN/TA notifications created by the alert engine (same second): prefer requested language
  const seen = new Set<string>()
  const notifications = all.filter((n) => {
    const key = `${n.deviceId}:${n.cropId ?? ''}:${n.marketId ?? ''}:${n.price ?? ''}:${Math.floor(n.createdAt.getTime() / 2000)}`
    if (seen.has(key)) return false
    const pairIsOtherLang = all.some((o) => {
      const okey = `${o.deviceId}:${o.cropId ?? ''}:${o.marketId ?? ''}:${o.price ?? ''}:${Math.floor(o.createdAt.getTime() / 2000)}`
      return okey === key && o.id !== n.id && (lang === 'ta' ? o.title !== n.title : false) && isTamil(n.title) !== isTamil(o.title)
    })
    if (pairIsOtherLang) {
      const wantTamil = lang === 'ta'
      if (isTamil(n.title) !== wantTamil) return false
    }
    seen.add(key)
    return true
  })
  const unread = notifications.filter((n) => !n.read).length
  return NextResponse.json({ notifications, unread })
}

function isTamil(s: string): boolean {
  return /[\u0B80-\u0BFF]/.test(s)
}

/** POST { deviceId, ids?, all?: true } — mark notifications as read. */
export async function POST(req: NextRequest) {
  await ensureServices()
  const body = await req.json().catch(() => null)
  const deviceId: string = body?.deviceId
  if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
  if (body?.all) {
    await db.notification.updateMany({ where: { deviceId, read: false }, data: { read: true } })
  } else if (Array.isArray(body?.ids) && body.ids.length) {
    await db.notification.updateMany({ where: { deviceId, id: { in: body.ids } }, data: { read: true } })
  }
  return NextResponse.json({ ok: true })
}
