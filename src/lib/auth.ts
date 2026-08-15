import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      // OAuth: key the user by EMAIL (stable across providers) and link the
      // provider account to that canonical row. Keying by providerAccountId
      // (as before) forked identity — a resident who registered with a code
      // then signed in with Google got a second, id-mismatched user, and every
      // create failed on a foreign key. If linking fails, fail the sign-in
      // rather than leaving a broken session.
      if (!user.email) return false;
      try {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name, image: user.image },
          create: { email: user.email, name: user.name, image: user.image },
        });

        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
          create: {
            userId: dbUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
        });
      } catch (e) {
        console.error("Failed to link OAuth account:", e);
        return false;
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      // Always resolve identity + role/hall from the canonical User row by
      // email. This guarantees token.id is a real User.id (never an OAuth
      // providerAccountId) and self-heals any older token that stored the
      // wrong id. Falls back to token.id for credentials sessions.
      const email = (user?.email ?? token.email) as string | undefined;
      const dbUser = email
        ? await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, hallId: true } })
        : token.id
        ? await prisma.user.findUnique({ where: { id: token.id as string }, select: { id: true, role: true, hallId: true } })
        : null;
      if (dbUser) {
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.hallId = dbUser.hallId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.hallId = token.hallId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
