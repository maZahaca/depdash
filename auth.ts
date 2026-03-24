import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import GitLabProvider from 'next-auth/providers/gitlab';
import { authConfig } from './auth.config';
import prisma from './lib/prisma';
import { z } from 'zod';
import { skipCSRFCheck } from '@auth/core';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Don't use adapter with JWT strategy for credentials provider
  // adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  ...(process.env.NODE_ENV === 'test' && { skipCSRFCheck: skipCSRFCheck }),
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(1)
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          console.error('Auth: Invalid credentials format');
          return null;
        }

        const { email, password } = parsedCredentials.data;

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          console.error('Auth: User not found or no password:', email);
          return null; // User doesn't exist or has no password (OAuth user)
        }

        // Verify password
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          console.error('Auth: Invalid password for user:', email);
          return null;
        }

        console.log('Auth: Successfully authenticated user:', email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          image: user.image,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET
      ? [
          GitLabProvider({
            clientId: process.env.GITLAB_CLIENT_ID,
            clientSecret: process.env.GITLAB_CLIENT_SECRET,
            ...(process.env.GITLAB_URL && {
              issuer: process.env.GITLAB_URL,
            }),
          }),
        ]
      : []),
  ],
});
