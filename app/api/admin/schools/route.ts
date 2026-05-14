// /api/admin/schools — canonical alias for /api/dev/schools
// Spec maps: GET /api/admin/schools, DELETE /api/admin/schools/[id]
// This file handles the collection (GET). Individual school actions use [id]/route.ts.
import { NextRequest, NextResponse } from 'next/server';

/**
 * Forward all requests to the canonical /api/dev/schools handler.
 * Keeping logic in one place; this is just a routing alias.
 */
async function forward(request: NextRequest, method: string, body?: string): Promise<NextResponse> {
  const devUrl = new URL('/api/dev/schools', request.nextUrl.origin);
  // Forward query params
  request.nextUrl.searchParams.forEach((v, k) => devUrl.searchParams.set(k, v));

  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      // Forward the session cookie so authDev() works
      cookie: request.headers.get('cookie') ?? '',
    },
  };
  if (body) init.body = body;

  const upstream = await fetch(devUrl.toString(), init);
  const json     = await upstream.json();
  return NextResponse.json(json, { status: upstream.status });
}

export async function GET(request: NextRequest) {
  return forward(request, 'GET');
}

export async function DELETE(request: NextRequest) {
  const body = await request.text();
  return forward(request, 'DELETE', body);
}

export async function PATCH(request: NextRequest) {
  const body = await request.text();
  return forward(request, 'PATCH', body);
}
