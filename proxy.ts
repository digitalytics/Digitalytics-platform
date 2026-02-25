import { auth } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import type { NextAuthRequest } from 'next-auth';

type ProxyHandler = (req: NextAuthRequest) => NextResponse | undefined;

const handler: ProxyHandler = (req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public routes
  const publicRoutes = ['/login', '/register', '/pending'];
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    if (session?.user && (session.user as Record<string, unknown>).status === 'ACTIVE') {
      const role = (session.user as Record<string, unknown>).role;
      const dest = role === 'ADMIN' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // Not authenticated → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const userStatus = (session.user as Record<string, unknown>).status as string;
  const userRole = (session.user as Record<string, unknown>).role as string;

  // Pending users
  if (userStatus === 'PENDING') {
    return NextResponse.redirect(new URL('/pending', req.url));
  }

  // Inactive users
  if (userStatus === 'INACTIVE') {
    return NextResponse.redirect(new URL('/login?error=INACTIVE', req.url));
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Root
  if (pathname === '/') {
    const dest = userRole === 'ADMIN' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
};

export default auth(handler as Parameters<typeof auth>[0]);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
