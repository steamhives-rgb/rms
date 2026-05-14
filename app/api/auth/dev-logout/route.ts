// POST /api/auth/dev-logout
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, data: { message: 'Logged out' } });
  // Clear both cookie types
  res.cookies.set('rms_dev_token', '', { path: '/', maxAge: 0 });
  res.cookies.set('rms_token',     '', { path: '/', maxAge: 0 });
  return res;
}
