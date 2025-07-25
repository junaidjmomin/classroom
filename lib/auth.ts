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
            // Core Classroom scopes
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
            // Additional scopes that might be needed
            "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
            "https://www.googleapis.com/auth/classroom.rosters.readonly",
            // For announcements (if needed)
            "https://www.googleapis.com/auth/classroom.announcements.readonly",
          ].join(" "),
          // Force consent to refresh permissions
          prompt: "consent",
          // Request offline access for refresh tokens
          access_type: "offline",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      console.log("🔧 JWT Callback:", { 
        hasAccount: !!account, 
        hasToken: !!token,
        tokenPreview: token?.accessToken?.substring(0, 20) + "..." 
      });
      
      if (account) {
        console.log("🔧 Account data:", {
          provider: account.provider,
          type: account.type,
          scope: account.scope,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at
        });
        
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
    },
  },
  // Enable debug messages in development
  debug: process.env.NODE_ENV === "development",
  
  // Custom pages for better error handling
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  
  // Session strategy
  session: {
    strategy: "jwt",
  },
}
