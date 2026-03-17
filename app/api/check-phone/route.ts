import { NextRequest, NextResponse } from 'next/server'
import { phoneAlreadyUsed, normalizePhone } from '@/lib/firestore'

export async function POST(req: NextRequest) {
  const { phone, venueId } = await req.json()
  if (!phone || !venueId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  const normalized = normalizePhone(phone)
  const used = await phoneAlreadyUsed(venueId, normalized)
  return NextResponse.json({ used, normalized })
}
