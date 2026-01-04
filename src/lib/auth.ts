import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account }) {
      console.log("JWT Callback - Account:", account); // DEBUG
      if (account) {
        token.accessToken = account.access_token;
        console.log("Token saved:", token.accessToken); // DEBUG
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback - Token:", token.accessToken); // DEBUG
      session.accessToken = token.accessToken as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return `${baseUrl}/dashboard`;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // ← EKLE
};

// NextAuth type declarations
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}