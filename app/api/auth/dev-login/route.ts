// app/api/auth/dev-login/route.ts
// Stateless dev auth — no database required.
// Issues a signed HMAC token stored in an httpOnly cookie.
// Verified in /api/auth/check via verifyDevToken from lib/auth.

import { NextRequest, NextResponse } from 'next/server';
import { getDevKey, signDevToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = (body.key ?? '').toString().trim();

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          error: 'Developer key is required.',
        },
        { status: 400 }
      );
    }

    const devKey = getDevKey();

    if (!devKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'DEV_KEY or DEV_KEY_HASH not set in .env.local',
        },
        { status: 503 }
      );
    }

    let valid = false;

    // bcrypt hash support
    if (devKey.startsWith('$2')) {
      const bcrypt = await import('bcryptjs');

      try {
        valid = await bcrypt.compare(key, devKey);
      } catch (err) {
        console.error('[bcrypt compare failed]', err);

        return NextResponse.json(
          {
            success: false,
            error: 'Invalid bcrypt hash configuration.',
          },
          { status: 500 }
        );
      }
    } else {
      // plain text fallback
      valid = key === devKey;
    }

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid developer key.',
        },
        { status: 403 }
      );
    }

    // Create signed token
    const token = signDevToken(devKey);

    const res = NextResponse.json({
      success: true,
    });

    // Dev auth cookie
    res.cookies.set('rms_dev_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    // Remove any stale school auth cookie
    res.cookies.set('rms_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (e) {
    console.error('[dev-login]', e);

    return NextResponse.json(
      {
        success: false,
        error: 'Dev login failed.',
      },
      { status: 500 }
    );
  }
}