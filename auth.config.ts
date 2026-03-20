import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnRoot = nextUrl.pathname === '/';

      // Allow public access to login page and root
      if (isOnLogin || isOnRoot) {
        return true;
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
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
