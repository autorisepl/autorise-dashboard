import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json()

  const correct = process.env.DASHBOARD_PASSWORD
  const sessionSecret = process.env.DASHBOARD_SESSION_SECRET

  if (!correct || !sessionSecret) {
    return NextResponse.json({ success: false, error: 'Auth not configured' }, { status: 500 })
  }

  if (password !== correct) {
    // Small delay to prevent brute force
    await new Promise((r) => setTimeout(r, 400))
    return NextResponse.json({ success: false, error: 'Złe hasło' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('autorise_session', sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('autorise_session')
  return res
}
