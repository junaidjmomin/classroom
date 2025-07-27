"use client"

import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Calendar, 
  Clock, 
  ExternalLink, 
  BookOpen, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  User,
  Plus,
  Brain,
  Target,
  Zap,
  Timer,
  TrendingUp,
  MessageSquare,
  Download,
  Settings,
  Lightbulb,
  BarChart3
} from "lucide-react"
import { fetchClassroomAssignments, PriorityCalculator, AITaskParser } from "@/lib/fetchClassroomAssignments"
import Link from "next/link"

export default function EnhancedClassroomDashboard() {
  const session = useSession()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTab, setSelectedTab] = useState("dashboard")
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    course: '',
    dueDate: '',
    estimatedTime: 60,
    impact: 3,
    contextSwitchCost: 2,
    description: ''
  })

  useEffect(() => {
    async function loadAssignments() {
      if (session?.status === "authenticated") {
        setLoading(true)
        setError(null)
        
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
          const fetchedAssignments = await fetchClassroomAssignments(session.data.accessToken)
          setAssignments(fetchedAssignments)
        } catch (error) {
          console.error("Failed to load assignments:", error)
          setError(error.message)
          setAssignments([])
        } finally {
          setLoading(false)
        }
      } else if (session?.status === "unauthenticated") {
        setLoading(false)
      }
    }

    loadAssignments()
  }, [session?.status, session?.data?.accessToken])

  const handleNaturalLanguageSubmit = () => {
    if (!naturalLanguageInput.trim()) return;
    
    const parsedTasks = AITaskParser.parseNaturalLanguage(naturalLanguageInput);
    setAssignments(prev => [...prev, ...parsedTasks]);
    setNaturalLanguageInput('');
  };

  const handleAddManualTask = () => {
    if (!newTask.title.trim()) return;
    
    const task = {
      ...newTask,
      id: `manual-${Date.now()}`,
      courseColor: 'bg-gray-500',
      status: 'pending',
      link: '#',
      workType: 'ASSIGNMENT',
      submissionStatus: 'NEW'
    };
    
    // Calculate priority score
    task.priorityScore = PriorityCalculator.calculatePriority(task);
    
    setAssignments(prev => [...prev, task].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)));
    setNewTask({
      title: '',
      course: '',
      dueDate: '',
      estimatedTime: 60,
      impact: 3,
      contextSwitchCost: 2,
      description: ''
    });
    setShowAddTask(false);
  };

  const getPriorityColor = (score) => {
    if (score >= 1.5) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 1.0) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return "No due date";
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays} days`;
  };

  const exportTasks = () => {
    const taskList = assignments.map((task, index) => 
      `${index + 1}. ${task.title} (${task.course})\n   Priority: ${task.priorityScore?.toFixed(2) || 'N/A'}\n   Estimated Time: ${task.estimatedTime || 'N/A'} minutes\n   Due: ${getDaysUntilDue(task.dueDate)}\n   Status: ${task.status}\n`
    ).join('\n');
    
    const blob = new Blob([taskList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-prioritized-tasks.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSmartRecommendations = () => {
    return AITaskParser.getSmartRecommendations(assignments);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (session?.status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your AI-powered assignments...</p>
        </div>
      </div>
    )
  }

  if (session?.status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Task Prioritizer</h2>
          <p className="text-gray-600 mb-6">Connect with Google Classroom to get intelligent task prioritization using quantitative models and natural language processing</p>
          <Button onClick={() => signIn("google")} size="lg">
            <BookOpen className="h-5 w-5 mr-2" />
            Sign in with Google
          </Button>
        </div>
      </div>
    )
  }

  const urgentTasks = assignments.filter(a => a.status === 'urgent' && a.status !== 'completed').length;
  const quickWins = assignments.filter(a => a.estimatedTime <= 60 && a.status !== 'completed').length;
  const completedTasks = assignments.filter(a => a.status === 'completed').length;
  const avgPriority = assignments.length > 0 
    ? assignments.reduce((sum, a) => sum + (a.priorityScore || 0), 0) / assignments.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AI-Powered Task Prioritizer</h1>
                <p className="text-sm text-gray-600">Quantitative modeling meets natural language processing</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{session.data?.user?.name}</span>
                </div>
                <div className="text-xs text-gray-500">{session.data?.user?.email}</div>
              </div>
              <Button onClick={exportTasks} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <Target className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="add-tasks">
              <Plus className="h-4 w-4 mr-2" />
              Add Tasks
            </TabsTrigger>
            <TabsTrigger value="insights">
              <BarChart3 className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Tasks</p>
                      <p className="text-2xl font-bold">{assignments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">Urgent</p>
                      <p className="text-2xl font-bold text-red-600">{urgentTasks}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600">Quick Wins</p>
                      <p className="text-2xl font-bold text-yellow-600">{quickWins}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Avg Priority</p>
                      <p className="text-2xl font-bold text-green-600">{avgPriority.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations */}
            {assignments.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-purple-600" />
                    <span>AI Smart Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getSmartRecommendations().map((recommendation, index) => (
                      <div key={index} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                        <p className="text-sm text-purple-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Priority Tasks */}
            {assignments.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span>Next 3 Priorities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {assignments.slice(0, 3).map((assignment, index) => (
                      <div key={assignment.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-blue-900">#{index + 1}: {assignment.title}</p>
                            <p className="text-sm text-blue-700">{assignment.course} • {assignment.estimatedTime}min • Impact: {assignment.impact}/5</p>
                          </div>
                          <Badge className={getPriorityColor(assignment.priorityScore || 0)}>
                            {(assignment.priorityScore || 0).toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          {PriorityCalculator.getRecommendation(assignment, index + 1)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Tasks Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>All Tasks (AI Prioritized)</span>
                </h2>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {assignments.map((assignment, index) => (
                  <Card key={assignment.id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
