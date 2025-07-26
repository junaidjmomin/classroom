import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Vercel-specific environment variable validation
const requiredEnvVars = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL
}

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key)

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingEnvVars)
  console.error("📝 Make sure these are set in Vercel Dashboard:")
  missingEnvVars.forEach(key => console.error(`   - ${key}`))
}

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
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      // Debug logging for Vercel
      if (process.env.NODE_ENV === "development") {
        console.log("🔧 JWT Callback - Vercel Debug:");
        console.log("  - Token exists:", !!token);
        console.log("  - Account exists:", !!account);
        console.log("  - User exists:", !!user);
        console.log("  - NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
      }

      // Initial sign in - account is only available on first call
      if (account && user) {
        console.log("🔑 Setting up new token with account data");
        console.log("🔑 Account provider:", account.provider);
        console.log("🔑 Account type:", account.type);
        console.log("🔑 Access token length:", account.access_token?.length || 0);
        console.log("🔑 Refresh token exists:", !!account.refresh_token);
        console.log("🔑 Expires at:", account.expires_at);
        
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
        }
      }

      // Return previous token if the access token has not expired yet
      const tokenExpires = (token.accessTokenExpires as number) || 0
      if (Date.now() < tokenExpires) {
        if (process.env.NODE_ENV === "development") {
          console.log("🔑 Token still valid, expires in:", Math.round((tokenExpires - Date.now()) / 1000 / 60), "minutes");
        }
        return token
      }

      // Access token has expired, try to update it
      console.log("🔄 Token expired, attempting refresh");
      return refreshAccessToken(token)
    },

    async session({ session, token }) {
      if (process.env.NODE_ENV === "development") {
        console.log("🔧 Session Callback - Vercel Debug:");
        console.log("  - Session exists:", !!session);
        console.log("  - Token exists:", !!token);
        console.log("  - Token has accessToken:", !!(token as any).accessToken);
        console.log("  - Token error:", (token as any).error);
      }
      
      // Send properties to the client
      session.accessToken = (token as any).accessToken
      session.error = (token as any).error

      return session
    }
  },

  // Vercel-specific configuration
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Important for Vercel deployments
  useSecureCookies: process.env.NODE_ENV === "production",
  
  // Enable debug only in development
  debug: process.env.NODE_ENV === "development",

  // Custom pages for better error handling
  pages: {
    error: '/auth/error',
  },
}

/**
 * Refresh access token for Vercel deployment
 */
async function refreshAccessToken(token: any) {
  try {
    console.log("🔄 Attempting token refresh for Vercel deployment...");
    
    const url = "https://oauth2.googleapis.com/token"
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error("❌ Token refresh failed:", {
        status: response.status,
        error: refreshedTokens
      });
      throw refreshedTokens
    }

    console.log("✅ Token refreshed successfully");
    
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in * 1000),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error("❌ Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}
