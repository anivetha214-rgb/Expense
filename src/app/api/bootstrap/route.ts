import { NextResponse } from 'next/server'
import { ensureServices, getMlStatus, getSocketStatus } from '@/lib/ensure-services'

export const dynamic = 'force-dynamic'

/**
 * One-time bootstrap for the app: seeds DB, starts Flask ML service +
 * socket.io service if needed, returns runtime status for the UI.
 */
export async function GET() {
  try {
    await ensureServices()
  } catch (e) {
    console.error('bootstrap error', e)
  }
  const [ml, socket] = await Promise.all([getMlStatus(), getSocketStatus()])
  return NextResponse.json({ ml, socket })
}
