import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Login sonrası /dashboard'a yönlendir
      if (url.startsWith(baseUrl)) return `${baseUrl}/dashboard`
      return baseUrl
    },
  },
})

export { handler as GET, handler as POST }