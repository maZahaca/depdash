import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId?: string;
      isSuperAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    organizationId?: string;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    organizationId?: string;
    isSuperAdmin?: boolean;
  }
}
