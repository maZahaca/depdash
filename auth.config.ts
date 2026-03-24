import type { NextAuthConfig } from 'next-auth';
import prisma from './lib/prisma';

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
        return auth?.user?.isSuperAdmin || false;
      }

      // Protect dashboard routes - require authentication
      if (isOnDashboard) {
        if (!isLoggedIn) {
          return false; // NextAuth will redirect to /login
        }
        return true;
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
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - fetch user data
      if (user) {
        token.sub = user.id;

        // Fetch isSuperAdmin and organizationId
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            isSuperAdmin: true,
          },
        });

        token.isSuperAdmin = dbUser?.isSuperAdmin || false;

        // For non-super admins, fetch their organization
        if (!dbUser?.isSuperAdmin) {
          const membership = await prisma.organizationMember.findFirst({
            where: { userId: user.id },
            select: { organizationId: true },
          });
          token.organizationId = membership?.organizationId || undefined;
        } else {
          // Super admins start without an org
          token.organizationId = undefined;
        }
      }

      // Handle org selection update
      if (trigger === 'update' && session?.organizationId) {
        token.organizationId = session.organizationId;
      }

      return token;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
