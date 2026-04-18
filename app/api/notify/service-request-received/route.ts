import { NextRequest, NextResponse } from 'next/server'
import { sendServiceRequestReceived } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await sendServiceRequestReceived(body)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
