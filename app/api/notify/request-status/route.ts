import { NextRequest, NextResponse } from 'next/server'
import { sendRequestStatusUpdate } from '@/lib/email'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Look up renter email using service role if renterId provided
    let renterEmail = body.renterEmail
    if (body.renterId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data } = await admin.auth.admin.getUserById(body.renterId)
      if (data.user?.email) renterEmail = data.user.email
    }

    await sendRequestStatusUpdate({ ...body, renterEmail })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
