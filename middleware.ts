import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  const isOnAdmin = req.nextUrl.pathname.startsWith('/admin');
  const session = req.auth;

  // Super admins without org trying to access dashboard -> redirect to admin
  if (
    isOnDashboard &&
    session?.user?.isSuperAdmin &&
    !session?.user?.organizationId
  ) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // Regular users trying to access admin -> redirect to dashboard
  if (isOnAdmin && session?.user && !session.user.isSuperAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Allow admin routes for super admins regardless of org selection
  if (isOnAdmin && session?.user?.isSuperAdmin) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs',
};
