import { NextResponse } from 'next/server'
import { ensureMlService } from '@/lib/ensure-services'

export const dynamic = 'force-dynamic'

/** Flask ML engine status + per-crop accuracy (starts the service if needed). */
export async function GET() {
  const ml = await ensureMlService()
  return NextResponse.json(ml)
}
