import { NextRequest, NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** GET ?deviceId= — farmer profile (device-scoped, no password friction). */
export async function GET(req: NextRequest) {
  await ensureServices()
  const deviceId = req.nextUrl.searchParams.get('deviceId') ?? ''
  if (!deviceId) return NextResponse.json({ profile: null })
  const profile = await db.profile.findUnique({ where: { deviceId } })
  return NextResponse.json({ profile })
}

/** POST { deviceId, name, phone, district, language } — upsert profile. */
export async function POST(req: NextRequest) {
  await ensureServices()
  const body = await req.json().catch(() => null)
  const deviceId: string = body?.deviceId
  const name: string = (body?.name ?? '').trim()
  if (!deviceId || !name) {
    return NextResponse.json({ error: 'deviceId and name are required' }, { status: 400 })
  }
  const profile = await db.profile.upsert({
    where: { deviceId },
    update: {
      name,
      phone: body?.phone ? String(body.phone).trim() : null,
      district: body?.district ?? null,
      language: body?.language === 'ta' ? 'ta' : 'en',
    },
    create: {
      deviceId,
      name,
      phone: body?.phone ? String(body.phone).trim() : null,
      district: body?.district ?? null,
      language: body?.language === 'ta' ? 'ta' : 'en',
    },
  })
  return NextResponse.json({ profile })
}
