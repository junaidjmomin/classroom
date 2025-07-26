"use client"

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import Link from 'next/link'

const errorMessages = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification token has expired or has already been used.",
  Default: "An error occurred during authentication.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from an OAuth provider.",
  OAuthCreateAccount: "Could not create OAuth provider user in the database.",
  EmailCreateAccount: "Could not create email provider user in the database.",
  Callback: "Error in the OAuth callback handler route.",
  OAuthAccountNotLinked: "The email on the account is already linked, but not with this OAuth account.",
  EmailSignin: "Sending the e-mail with the verification token failed.",
  CredentialsSignin: "The authorize callback returned null in the Credentials provider.",
  SessionRequired: "The content of this page requires you to be signed in at all times.",
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') as keyof typeof errorMessages
  const errorMessage = errorMessages[error] || errorMessages.Default

  const getErrorDetails = (error: string) => {
    switch (error) {
      case 'Configuration':
        return {
          title: "Configuration Error",
          description: "There's an issue with the authentication setup. Please contact the administrator.",
          suggestions: [
            "Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Vercel",
            "Verify that NEXTAUTH_URL matches your deployment URL",
            "Ensure NEXTAUTH_SECRET is properly configured"
          ]
        }
      case 'AccessDenied':
        return {
          title: "Access Denied", 
          description: "You don't have permission to access this application.",
          suggestions: [
            "Make sure your Google account is added to the test users list",
            "Check if the Google Cloud app is in testing mode",
            "Contact the administrator to be added as a test user"
          ]
        }
      case 'OAuthCallback':
        return {
          title: "OAuth Callback Error",
          description: "There was an error processing the Google OAuth response.",
          suggestions: [
            "Check that the redirect URI in Google Cloud Console matches exactly",
            "Verify that the Google Classroom API is enabled",
            "Make sure your app is not exceeding Google's rate limits"
          ]
        }
      default:
        return {
          title: "Authentication Error",
          description: errorMessage,
          suggestions: [
            "Try signing in again",
            "Clear your browser cookies and cache",
            "Contact support if the problem persists"
          ]
        }
    }
  }

  const errorDetails = getErrorDetails(error)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {errorDetails.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {errorDetails.description}
            </p>
            
            {error && (
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-sm font-mono text-gray-800">
                  Error Code: {error}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Possible solutions:</h3>
            <ul className="space-y-2">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-600 text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button asChild className="flex-1">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
            
            <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              If this problem persists, please check the Vercel function logs or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center p-10 text-gray-600">Loading error info...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
