import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/jwt-secret';

// NOTE: This file runs in the Proxy runtime, which is deployed to the Edge on
// Vercel. `jsonwebtoken` depends on Node's `crypto` and throws there, which used
// to make every token fail verification and bounce /dashboard visits to /login.
// `jose` works on both Edge and Node and verifies the same HS256 token that
// `signToken` (jsonwebtoken) produces with the same secret.
async function verifyToken(token: string | undefined): Promise<{ role?: string } | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('gb_token')?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    if (!(await verifyToken(token))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
