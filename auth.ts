import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import GitLabProvider from 'next-auth/providers/gitlab';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { authConfig } from './auth.config';
import prisma from './lib/prisma';
import { z } from 'zod';
import { skipCSRFCheck } from '@auth/core';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Adapter required for OAuth providers (Google, GitHub, GitLab)
  adapter: PrismaAdapter(prisma),
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

        // Find user with membership info
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              take: 1,
              select: {
                organizationId: true,
              },
            },
          },
        });

        if (!user || !user.password) {
          console.error('Auth: User not found or no password');
          return null; // User doesn't exist or has no password (OAuth user)
        }

        // Verify password
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          console.error('Auth: Invalid password');
          return null;
        }

        console.log('Auth: Successfully authenticated user');
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          image: user.image,
          isSuperAdmin: user.isSuperAdmin,
          organizationId: user.isSuperAdmin ? undefined : user.memberships[0]?.organizationId,
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
