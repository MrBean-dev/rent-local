import { NextRequest, NextResponse } from 'next/server'
import { sendServiceRequestStatusUpdate } from '@/lib/email'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let hirerEmail = body.hirerEmail
    if (body.hirerId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data } = await admin.auth.admin.getUserById(body.hirerId)
      if (data.user?.email) hirerEmail = data.user.email
    }

    await sendServiceRequestStatusUpdate({ ...body, hirerEmail })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
