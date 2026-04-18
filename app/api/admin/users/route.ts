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
  const { data: { users } } = await sb.auth.admin.listUsers()
  const { data: profiles } = await (sb.from('profiles') as any).select('id, name, phone, location, role')

  const profileMap: Record<string, any> = {}
  profiles?.forEach((p: any) => { profileMap[p.id] = p })

  const result = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: profileMap[u.id]?.name ?? '',
    location: profileMap[u.id]?.location ?? '',
    role: profileMap[u.id]?.role ?? 'user',
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, action } = await req.json()
  const sb = admin()

  if (action === 'ban') {
    await sb.auth.admin.updateUserById(userId, {
      ban_duration: '876600h', // 100 years
    })
  } else if (action === 'unban') {
    await sb.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  } else if (action === 'make_admin') {
    await (sb.from('profiles') as any).update({ role: 'admin' }).eq('id', userId)
  } else if (action === 'remove_admin') {
    await (sb.from('profiles') as any).update({ role: 'user' }).eq('id', userId)
  }

  return NextResponse.json({ ok: true })
}
