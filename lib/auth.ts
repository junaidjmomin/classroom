import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
            "https://www.googleapis.com/auth/classroom.rosters.readonly",
            "https://www.googleapis.com/auth/classroom.announcements.readonly",
          ].join(" "),
          prompt: "consent",        // Force consent to re-grant permissions
          access_type: "offline",   // Request refresh token
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      console.log("🔧 JWT Callback:", { 
        hasAccount: !!account, 
        hasToken: !!token,
        tokenPreview: token?.accessToken?.substring?.(0, 20) + "..."
      });

      // ✅ Additional Debug Logs
      if (account) {
        console.log("🧪 Account Info:", {
          provider: account.provider,
          type: account.type,
          scope: account.scope,
          access_token: account.access_token?.substring?.(0, 15) + "...",
          refresh_token: account.refresh_token?.substring?.(0, 15) + "...",
          expires_at: account.expires_at
        });
      } else {
        console.log("🧪 No account object passed. Existing token state:", token);
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      return token;
    },

    async session({ session, token }) {
      console.log("🔧 Session Callback:", { 
        hasSession: !!session,
        hasToken: !!token,
        hasAccessToken: !!token.accessToken 
      });

      session.accessToken = token.accessToken as string;
      return session;
    }
  },

  // Add custom sign-in & error pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Use JWT for sessions
  session: {
    strategy: "jwt",
  },

  // Enable debug logs in dev mode
  debug: process.env.NODE_ENV === "development",
}
