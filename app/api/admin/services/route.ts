import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/adminAuth'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sb = admin()
  const { data } = await (sb.from('service_listings') as any)
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { serviceId, action } = await req.json()
  const sb = admin()
  if (action === 'delete') {
    await (sb.from('service_listings') as any).delete().eq('id', serviceId)
  } else if (action === 'hide') {
    await (sb.from('service_listings') as any).update({ available: false }).eq('id', serviceId)
  } else if (action === 'show') {
    await (sb.from('service_listings') as any).update({ available: true }).eq('id', serviceId)
  }
  return NextResponse.json({ ok: true })
}
