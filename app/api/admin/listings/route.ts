import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const sb = admin()
  const { data } = await (sb.from('listings') as any)
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { listingId, action } = await req.json()
  const sb = admin()

  if (action === 'delete') {
    await (sb.from('listings') as any).delete().eq('id', listingId)
  } else if (action === 'hide') {
    await (sb.from('listings') as any).update({ available: false }).eq('id', listingId)
  } else if (action === 'show') {
    await (sb.from('listings') as any).update({ available: true }).eq('id', listingId)
  }

  return NextResponse.json({ ok: true })
}
