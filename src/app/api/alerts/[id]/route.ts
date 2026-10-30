import { NextRequest, NextResponse } from 'next/server'
import { ensureServices } from '@/lib/ensure-services'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** PATCH — reactivate an alert (reset trigger) or update target. */
export async function PATCH(req: NextRequest) {
  await ensureServices()
  const body = await req.json().catch(() => null)
  const id: string = body?.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data: Record<string, unknown> = {}
  if (body?.active === true) {
    data.active = true
    data.triggeredAt = null
  }
  if (Number.isFinite(Number(body?.targetPrice)) && Number(body?.targetPrice) > 0) {
    data.targetPrice = Number(body.targetPrice)
  }
  const alert = await db.alert.update({ where: { id }, data })
  return NextResponse.json({ alert })
}

/** DELETE ?id=... */
export async function DELETE(req: NextRequest) {
  await ensureServices()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.alert.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
