import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnRoot = nextUrl.pathname === '/';

      // Allow public access to login page and root
      if (isOnLogin || isOnRoot) {
        return true;
      }

      // Protect admin routes - super admins only
      if (isOnAdmin) {
        if (!isLoggedIn) {
          return false; // NextAuth will redirect to /login
        }
        if (!auth?.user?.isSuperAdmin) {
          // Redirect non-super-admins to dashboard
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }

      // Protect dashboard routes - require authentication
      if (isOnDashboard) {
        return isLoggedIn;
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user = session.user || {};
        session.user.id = token.sub;
        session.user.organizationId = token.organizationId as string | undefined;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean | undefined;
      }
      return session;
    },
    // JWT callback moved to auth.ts to access Prisma for OAuth organizationId lookup
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
