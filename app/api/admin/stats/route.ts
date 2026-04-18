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

  const [users, listings, requests, reviews, messages] = await Promise.all([
    sb.auth.admin.listUsers(),
    (sb.from('listings') as any).select('id, available, created_at', { count: 'exact' }),
    (sb.from('rental_requests') as any).select('id, status', { count: 'exact' }),
    (sb.from('reviews') as any).select('id', { count: 'exact' }),
    (sb.from('messages') as any).select('id', { count: 'exact' }),
  ])

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  return NextResponse.json({
    users: {
      total: users.data?.users?.length ?? 0,
      recent: users.data?.users?.filter((u) => u.created_at > thirtyDaysAgo).length ?? 0,
    },
    listings: {
      total: listings.count ?? 0,
      available: listings.data?.filter((l: any) => l.available).length ?? 0,
      recent: listings.data?.filter((l: any) => l.created_at > thirtyDaysAgo).length ?? 0,
    },
    requests: {
      total: requests.count ?? 0,
      pending: requests.data?.filter((r: any) => r.status === 'pending').length ?? 0,
      approved: requests.data?.filter((r: any) => r.status === 'approved').length ?? 0,
    },
    reviews: { total: reviews.count ?? 0 },
    messages: { total: messages.count ?? 0 },
  })
}
