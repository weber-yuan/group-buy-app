import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('gb_token')?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    if (!token || !verifyToken(token)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
