"use client"

import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ExternalLink, BookOpen, AlertCircle, RefreshCw, LogOut, User } from "lucide-react"
import { fetchClassroomAssignments } from "@/lib/fetchClassroomAssignments"
import Link from "next/link"

// Diagnostics component for debugging
function ClassroomDiagnostics({ accessToken }: { accessToken: string }) {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    try {
      // Test 1: Basic API access
      console.log("🔬 Test 1: Basic API access")
      const profileResponse = await fetch(
        "https://classroom.googleapis.com/v1/userProfiles/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      
      const profileData = profileResponse.ok ? await profileResponse.json() : null
      results.tests.push({
        name: "User Profile Access",
        status: profileResponse.ok ? "✅ PASS" : "❌ FAIL",
        details: profileResponse.ok 
          ? {
              name: profileData.name.fullName,
              email: profileData.emailAddress,
              id: profileData.id
            }
          : `Error ${profileResponse.status}: ${await profileResponse.text()}`
      })

      // Test 2: Courses access
      console.log("🔬 Test 2: Courses access")
      const coursesResponse = await fetch(
        "https://classroom.googleapis.com/v1/courses",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      
      const coursesData = coursesResponse.ok ? await coursesResponse.json() : null
      results.tests.push({
        name: "Courses Access",
        status: coursesResponse.ok ? "✅ PASS" : "❌ FAIL",
        details: coursesResponse.ok 
          ? {
              totalCourses: coursesData?.courses?.length || 0,
              activeCourses: coursesData?.courses?.filter((c: any) => c.courseState === 'ACTIVE').length || 0,
              courses: coursesData?.courses?.map((c: any) => ({
                name: c.name,
                id: c.id,
                state: c.courseState,
                enrollmentCode: c.enrollmentCode
              })) || []
            }
          : `Error ${coursesResponse.status}: ${await coursesResponse.text()}`
      })

      // Test 3: Course work for first active course
      if (coursesData?.courses?.length > 0) {
        const activeCourses = coursesData.courses.filter((c: any) => c.courseState === 'ACTIVE')
        
        if (activeCourses.length > 0) {
          const firstCourse = activeCourses[0]
          console.log("🔬 Test 3: Course work access")
          const courseWorkResponse = await fetch(
            `https://classroom.googleapis.com/v1/courses/${firstCourse.id}/courseWork`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          )
          
          const courseWorkData = courseWorkResponse.ok ? await courseWorkResponse.json() : null
          results.tests.push({
            name: `Course Work Access (${firstCourse.name})`,
            status: courseWorkResponse.ok ? "✅ PASS" : "❌ FAIL",
            details: courseWorkResponse.ok 
              ? {
                  courseId: firstCourse.id,
                  courseName: firstCourse.name,
                  totalAssignments: courseWorkData?.courseWork?.length || 0,
                  publishedAssignments: courseWorkData?.courseWork?.filter((w: any) => w.state === 'PUBLISHED').length || 0,
                  assignments: courseWorkData?.courseWork?.map((w: any) => ({
                    title: w.title,
                    state: w.state,
                    workType: w.workType,
                    hasDueDate: !!w.dueDate,
                    creationTime: w.creationTime
                  })) || []
                }
              : `Error ${courseWorkResponse.status}: ${await courseWorkResponse.text()}`
          })
        } else {
          results.tests.push({
            name: "Course Work Access",
            status: "⏭️ SKIP",
            details: "No active courses found"
          })
        }
      }

    } catch (error) {
      results.tests.push({
        name: "Diagnostics Error",
        status: "❌ ERROR",
        details: error instanceof Error ? error.message : String(error)
      })
    }

    setDiagnostics(results)
    setLoading(false)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🔬 Classroom API Diagnostics
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            size="sm"
          >
            {loading ? "Running..." : "Run Tests"}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {!diagnostics && !loading && (
          <p className="text-gray-600">
            Click "Run Tests" to check your Classroom API access and diagnose why you have 0 assignments.
          </p>
        )}
        
        {loading && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Running diagnostics...</span>
          </div>
        )}
        
        {diagnostics && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Last run: {new Date(diagnostics.timestamp).toLocaleString()}
            </div>
            
            {diagnostics.tests.map((test: any, index: number) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{test.name}</span>
                  <Badge variant="outline">{test.status}</Badge>
                </div>
                
                <div className="text-sm bg-gray-50 p-2 rounded">
                  <pre className="whitespace-pre-wrap overflow-x-auto text-xs">
                    {typeof test.details === 'object' 
                      ? JSON.stringify(test.details, null, 2)
                      : test.details
                    }
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

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
      
      if (session?.status === "authenticated") {
        console.log("✅ Starting to load assignments...")
        console.log("🔑 Access token exists:", !!session.data?.accessToken)
        console.log("🔑 Session error:", session.data?.error)
        
        setLoading(true)
        setError(null)
        
        // Check for token refresh errors
        if (session.data?.error === "RefreshAccessTokenError") {
          setError("Your session has expired. Please sign in again.")
          setLoading(false)
          return
        }
        
        if (!session.data?.accessToken) {
          setError("No access token available. Please sign out and sign in again.")
          setLoading(false)
          return
        }
        
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
            sessionError: session.data?.error,
            userEmail: session.data?.user?.email,
            userName: session.data?.user?.name,
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

  const handleSignOut = async () => {
    await signOut()
  }

  const handleRefresh = () => {
    window.location.reload()
  }

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
        <div>User: <span className="font-mono">{debugInfo?.userName} ({debugInfo?.userEmail})</span></div>
        <div>Session Error: <span className="font-mono">{debugInfo?.sessionError || "None"}</span></div>
        <div>Assignment Count: <span className="font-mono">{assignments.length}</span></div>
        <div>Loading: <span className="font-mono">{loading ? "Yes" : "No"}</span></div>
        <div>Error: <span className="font-mono">{error || "None"}</span></div>
        <div>Last Update: <span className="font-mono">{debugInfo?.timestamp}</span></div>
      </div>
      <div className="flex gap-2 mt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh Page
        </Button>
        {session?.status === "authenticated" && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out & Try Again
          </Button>
        )}
      </div>
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

        {/* API Diagnostics - Remove in production */}
        {session.data?.accessToken && (
          <ClassroomDiagnostics accessToken={session.data.accessToken} />
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Error: {error}</span>
            </div>
          </div>
        )}

        {/* Header with Logout */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Classroom Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{session.data?.user?.name}</span>
                </div>
                <div className="text-xs text-gray-500">{session.data?.user?.email}</div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Link>
              </Button>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600">
              {assignments.length} assignments • {assignments.filter((a) => a.status === "urgent").length} urgent
            </p>
          </div>
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
                      <span>{assignment.dueTime}</span>
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
              • Your courses are not in ACTIVE state<br/>
              • Assignments are not PUBLISHED<br/>
              Run the diagnostics above to check your courses and assignments.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
