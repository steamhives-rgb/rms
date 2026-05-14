// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — Middleware
//
// Route protection:
//   /dashboard  → school session required  → redirect /login
//   /admin      → school OR dev session    → redirect /login
//   /teacher    → any session required     → redirect /teacher-login
//   /dev        → self-gated (dev-key form renders on the page)
//
// IMPORTANT: /login and /teacher-login must NOT be in the matcher,
// or the startsWith checks below create infinite redirect loops.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SCHOOL_AUTH  = ['/dashboard', '/setup'];
const DEV_OR_SCHOOL_AUTH = ['/admin'];         // dev token OR school token accepted
const TEACHER_AUTH = ['/teacher'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token    = request.cookies.get('rms_token')?.value;
  const devToken = request.cookies.get('rms_dev_token')?.value;

  // Public routes — never redirect
  if (
    pathname === '/login' ||
    pathname === '/teacher-login' ||
    pathname.startsWith('/onboarding')
  ) {
    return NextResponse.next();
  }

  const needsSchoolAuth    = SCHOOL_AUTH.some(p        => pathname.startsWith(p));
  const needsDevOrSchool   = DEV_OR_SCHOOL_AUTH.some(p => pathname.startsWith(p));
  const needsTeacherAuth   = pathname.startsWith('/teacher/') || pathname === '/teacher';

  // /dashboard, /setup — school admin token only (not teacher tokens).
  // The middleware can't verify teacher_id without a DB call, so we rely on
  // the dashboard layout + API routes (authSchoolAdmin) as the real guard.
  // Here we at minimum require *some* token; layout handles the teacher case.
  if (needsSchoolAuth && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // /admin — accept dev token OR school token
  if (needsDevOrSchool && !token && !devToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // /teacher — any session
  if (needsTeacherAuth && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/teacher-login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/setup/:path*',
    '/setup',
    '/teacher/:path*',
    '/teacher',
    '/dev',
    '/login',
    '/teacher-login',
    '/onboarding/:path*',
  ],
};