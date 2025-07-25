"use client"

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ExternalLink, BookOpen, AlertCircle } from "lucide-react"
import { fetchClassroomAssignments } from "@/lib/fetchClassroomAssignments"

export default function ClassroomDashboard() {
  const session = useSession()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function loadAssignments() {
      console.log("🔄 useEffect triggered, session status:", session?.status)
      console.log("🔄 Session data:", session?.data)
      
      if (session?.status === "authenticated" && session.data?.accessToken) {
        console.log("✅ Starting to load assignments...")
        setLoading(true)
        setError(null)
        
        try {
          console.log("🚀 Calling fetchClassroomAssignments...")
          const fetchedAssignments = await fetchClassroomAssignments(session.data.accessToken)
          
          console.log("📥 Received assignments:", fetchedAssignments)
          setAssignments(fetchedAssignments)
          
          // Set debug info
          setDebugInfo({
            sessionStatus: session.status,
            hasAccessToken: !!session.data?.accessToken,
            tokenPreview: session.data?.accessToken?.substring(0, 20) + "...",
            assignmentCount: fetchedAssignments.length,
            timestamp: new Date().toISOString()
          })
          
        } catch (error) {
          console.error("💥 Failed to load assignments:", error)
          setError(error.message)
          setAssignments([])
        } finally {
          setLoading(false)
        }
      } else if (session?.status === "unauthenticated") {
        console.log("❌ User not authenticated")
        setLoading(false)
      } else {
        console.log("⏳ Session still loading...")
      }
    }

    loadAssignments()
  }, [session?.status, session?.data?.accessToken])

  const displayedAssignments = showAll ? assignments : assignments.slice(0, 4)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return "No due date"
    
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "Overdue"
    if (diffDays === 0) return "Due today"
    if (diffDays === 1) return "Due tomorrow"
    return `Due in ${diffDays} days`
  }

  // Debug panel component
  const DebugPanel = () => (
    <div className="bg-gray-100 p-4 rounded-lg mb-4 text-sm">
      <h3 className="font-bold mb-2">🔧 Debug Information</h3>
      <div className="space-y-1">
        <div>Session Status: <span className="font-mono">{session?.status}</span></div>
        <div>Has Access Token: <span className="font-mono">{debugInfo?.hasAccessToken ? "✅" : "❌"}</span></div>
        <div>Token Preview: <span className="font-mono">{debugInfo?.tokenPreview || "None"}</span></div>
        <div>Assignment Count: <span className="font-mono">{assignments.length}</span></div>
        <div>Loading: <span className="font-mono">{loading ? "Yes" : "No"}</span></div>
        <div>Error: <span className="font-mono">{error || "None"}</span></div>
        <div>Last Update: <span className="font-mono">{debugInfo?.timestamp}</span></div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-2" 
        onClick={() => window.location.reload()}
      >
        🔄 Refresh Page
      </Button>
    </div>
  )

  if (session?.status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assignments...</p>
          <p className="text-xs text-gray-500 mt-2">Session: {session?.status}</p>
        </div>
      </div>
    )
  }

  if (session?.status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view your assignments</h2>
          <p className="text-gray-600 mb-6">Connect with Google Classroom to see your upcoming work</p>
          <Button onClick={() => signIn("google")}>Sign in with Google</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Debug Panel - Remove in production */}
        <DebugPanel />

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Error: {error}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Classroom Dashboard</h1>
          </div>
          <p className="text-gray-600">
            {assignments.length} assignments • {assignments.filter((a) => a.status === "urgent").length} urgent
          </p>
        </div>

        {/* Assignment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          {displayedAssignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{assignment.course}</p>
                    <CardTitle className="text-lg font-semibold text-gray-900">{assignment.title}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{getDaysUntilDue(assignment.dueDate)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>11:59 PM</span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <a href={assignment.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Show More Button */}
        {assignments.length > 4 && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setShowAll(!showAll)} className="px-8 py-2">
              {showAll ? "Show Less" : `Show ${assignments.length - 4} More Assignments`}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {assignments.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600">
              This could mean:<br/>
              • You're all caught up! 🎉<br/>
              • Your courses don't have assignments yet<br/>
              • There might be a permission issue<br/>
              Check the debug panel above for more details.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
