// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  BarChart3,
  Trash2,
  X,
} from "lucide-react";
import { fetchClassroomAssignments, PriorityCalculator, AITaskParser } from "@/lib/fetchClassroomAssignments";
import Link from "next/link";

// Session storage keys
const STORAGE_KEYS = {
  DELETED_TASKS: 'classroom_deleted_tasks',
  USER_TASKS: 'classroom_user_tasks'
};

interface Assignment {
  id: string;
  title: string;
  course: string;
  courseColor: string;
  dueDate: string;
  dueTime: string;
  status: "pending" | "urgent" | "completed";
  description: string;
  link: string;
  estimatedTime: number;
  impact: number;
  contextSwitchCost: number;
  priorityScore?: number;
  workType: string;
  submissionStatus: string;
  createdAt: string;
  isManual?: boolean;
}

export default function EnhancedClassroomDashboard() {
  const { data: session, status } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    course: "",
    dueDate: "",
    estimatedTime: 60,
    impact: 3,
    contextSwitchCost: 2,
    description: "",
  });

  // Load deleted tasks from memory on component mount
  useEffect(() => {
    try {
      const storedDeleted = localStorage.getItem(STORAGE_KEYS.DELETED_TASKS);
      if (storedDeleted) {
        setDeletedTaskIds(new Set(JSON.parse(storedDeleted)));
      }
    } catch (error) {
      console.error("Error loading deleted tasks:", error);
    }
  }, []);

  // Save deleted tasks to memory whenever the set changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_TASKS, JSON.stringify(Array.from(deletedTaskIds)));
    } catch (error) {
      console.error("Error saving deleted tasks:", error);
    }
  }, [deletedTaskIds]);

  useEffect(() => {
    async function loadAssignments() {
      if (status === "authenticated") {
        setLoading(true);
        setError(null);
        
        if (session?.error === "RefreshAccessTokenError") {
          setError("Your session has expired. Please sign in again.");
          setLoading(false);
          return;
        }
        
        if (!session?.accessToken) {
          setError("No access token available. Please sign out and sign in again.");
          setLoading(false);
          return;
        }
        
        try {
          const fetchedAssignments = await fetchClassroomAssignments(session.accessToken);
          console.log("Fetched assignments:", fetchedAssignments);
          
          // Load manual tasks from storage
          const storedTasks = localStorage.getItem(STORAGE_KEYS.USER_TASKS);
          let manualTasks: Assignment[] = [];
          if (storedTasks) {
            try {
              manualTasks = JSON.parse(storedTasks);
            } catch (e) {
              console.error("Error parsing stored tasks:", e);
            }
          }
          
          // Combine and filter out deleted tasks
          const allTasks = [...fetchedAssignments, ...manualTasks];
          const filteredTasks = allTasks.filter(task => !deletedTaskIds.has(task.id));
          
          if (filteredTasks.length === 0) {
            setError("No active assignments found. Add some tasks manually or check your Google Classroom account.");
          }
          
          setAssignments(filteredTasks);
        } catch (err: any) {
          console.error("Failed to load assignments:", err);
          setError(err.message || "Failed to load assignments. Please try again.");
          setAssignments([]);
        } finally {
          setLoading(false);
        }
      } else if (status === "unauthenticated") {
        setLoading(false);
      }
    }
    
    loadAssignments();
  }, [status, session?.accessToken, deletedTaskIds]);

  const handleDeleteTask = (taskId: string) => {
    setDeletedTaskIds(prev => new Set([...prev, taskId]));
    setAssignments(prev => prev.filter(task => task.id !== taskId));
    
    // Also remove from manual tasks storage if it's a manual task
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.USER_TASKS);
      if (storedTasks) {
        const tasks = JSON.parse(storedTasks);
        const updatedTasks = tasks.filter((task: Assignment) => task.id !== taskId);
        localStorage.setItem(STORAGE_KEYS.USER_TASKS, JSON.stringify(updatedTasks));
      }
    } catch (error) {
      console.error("Error updating stored tasks:", error);
    }
  };

  const handleNaturalLanguageSubmit = () => {
    if (!naturalLanguageInput.trim()) return;
    
    try {
      const parsed = AITaskParser.parseNaturalLanguage(naturalLanguageInput);
      if (!parsed || parsed.length === 0) {
        setError("Could not parse your input. Please try a different format.");
        return;
      }
      
      // Mark as manual tasks
      const manualTasks = parsed.map(task => ({ ...task, isManual: true }));
      
      setAssignments((prev) => {
        const updated = [...prev, ...manualTasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        
        // Save manual tasks to storage
        const allManualTasks = updated.filter(task => task.isManual);
        try {
          localStorage.setItem(STORAGE_KEYS.USER_TASKS, JSON.stringify(allManualTasks));
        } catch (error) {
          console.error("Error saving manual tasks:", error);
        }
        
        return updated;
      });
      
      setNaturalLanguageInput("");
      setError(null);
    } catch (err: any) {
      setError("Failed to parse task: " + err.message);
    }
  };

  const handleAddManualTask = () => {
    if (!newTask.title.trim()) {
      setError("Task title is required");
      return;
    }
    
    try {
      const task: Assignment = {
        ...newTask,
        id: `manual-${Date.now()}`,
        courseColor: "bg-gray-500",
        status: "pending",
        link: "#",
        workType: "ASSIGNMENT",
        submissionStatus: "NEW",
        createdAt: new Date().toISOString(),
        dueTime: "11:59 PM",
        isManual: true,
      };
      
      task.priorityScore = PriorityCalculator.calculatePriority(task);
      
      setAssignments((prev) => {
        const updated = [...prev, task].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        
        // Save manual tasks to storage
        const allManualTasks = updated.filter(task => task.isManual);
        try {
          localStorage.setItem(STORAGE_KEYS.USER_TASKS, JSON.stringify(allManualTasks));
        } catch (error) {
          console.error("Error saving manual tasks:", error);
        }
        
        return updated;
      });
      
      setNewTask({
        title: "",
        course: "",
        dueDate: "",
        estimatedTime: 60,
        impact: 3,
        contextSwitchCost: 2,
        description: "",
      });
      setShowAddTask(false);
      setError(null);
    } catch (err: any) {
      setError("Failed to add task: " + err.message);
    }
  };

  const clearDeletedTasks = () => {
    setDeletedTaskIds(new Set());
    try {
      localStorage.removeItem(STORAGE_KEYS.DELETED_TASKS);
    } catch (error) {
      console.error("Error clearing deleted tasks:", error);
    }
  };

  const getPriorityColor = (score: number | undefined) => {
    if (!score) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 1.5) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 1.0) return "text-orange-600 bg-orange-50 border-orange-200";
    if (score >= 0.5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return "No due date";
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Due today";
    if (diff === 1) return "Due tomorrow";
    return `Due in ${diff} days`;
  };

  const exportTasks = () => {
    try {
      const body = assignments
        .map(
          (task, idx) =>
            `${idx + 1}. ${task.title} (${task.course || 'No course'})\n` +
            `  Priority: ${task.priorityScore?.toFixed(2) ?? "N/A"}\n` +
            `  Estimated Time: ${task.estimatedTime} min\n` +
            `  Due: ${getDaysUntilDue(task.dueDate)}\n` +
            `  Status: ${task.status || 'pending'}\n`
        )
        .join("\n");
      
      const blob = new Blob([body], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ai-prioritized-tasks.txt";
      a.click();
    } catch (err) {
      setError("Failed to export tasks");
    }
  };

  const getSmartRecommendations = () => {
    try {
      return AITaskParser.getSmartRecommendations(assignments);
    } catch (err) {
      setError("Failed to generate recommendations");
      return [];
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Stats calculations with null checks
  const urgentTasks = assignments.filter((a) => 
    a.status === "urgent" || (a.dueDate && getDaysUntilDue(a.dueDate).includes("today"))
  ).length;
  
  const quickWins = assignments.filter((a) => 
    a.estimatedTime <= 60 && a.status !== "completed"
  ).length;
  
  const avgPriority = assignments.length > 0
    ? assignments.reduce((sum, a) => sum + (a.priorityScore || 0), 0) / assignments.length
    : 0;

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600">Loading your AI-powered assignments...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Task Prioritizer</h2>
          <p className="text-gray-600 mb-6">
            Connect with Google Classroom to get intelligent task prioritization using quantitative modeling
            and NLP.
          </p>
          <Button onClick={() => signIn("google")} size="lg" className="w-full">
            <BookOpen className="h-5 w-5 mr-2" />
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="block">{error}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-700 hover:text-red-800 p-1"
              onClick={() => setError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">AI Task Prioritizer</h1>
              <p className="text-sm text-gray-600">
                {session?.user?.email || "Classroom Dashboard"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={handleRefresh} className="flex-1 md:flex-none">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={() => signOut()} 
              className="flex-1 md:flex-none"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <Button 
              variant="default" 
              onClick={() => setShowAddTask(true)}
              className="flex-1 md:flex-none"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <Target className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Lightbulb className="h-4 w-4 mr-2" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              {assignments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No assignments found</h3>
                  <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    You don't have any active assignments right now. Try adding one manually or check your Google Classroom account.
                  </p>
                  <div className="mt-6 space-x-3">
                    <Button
                      variant="default"
                      onClick={() => setShowAddTask(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manual Task
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center">
                          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                          Urgent Tasks
                        </CardDescription>
                        <CardTitle className="text-2xl">{urgentTasks}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-500">
                          High priority tasks needing immediate attention
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center">
                          <Timer className="h-4 w-4 mr-2 text-blue-500" />
                          Quick Wins
                        </CardDescription>
                        <CardTitle className="text-2xl">{quickWins}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-500">
                          Tasks that can be completed in under 1 hour
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                          Avg Priority
                        </CardDescription>
                        <CardTitle className="text-2xl">
                          {avgPriority.toFixed(2)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-500">
                          Lower is better (0-2 scale)
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Priority Tasks */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Priority Tasks</span>
                        <Badge variant="outline" className="flex items-center">
                          {assignments.length} total
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {assignments.slice(0, 10).map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium flex items-center">
                                  <span 
                                    className={`inline-block h-3 w-3 rounded-full mr-2 ${assignment.courseColor || 'bg-gray-500'}`}
                                  />
                                  {assignment.title}
                                  {assignment.isManual && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Manual
                                    </Badge>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {assignment.course || 'No course specified'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={`${getPriorityColor(assignment.priorityScore)}`}
                                >
                                  {assignment.priorityScore?.toFixed(2) || 'N/A'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTask(assignment.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                              <div className="flex items-center text-gray-500">
                                <Calendar className="h-4 w-4 mr-1" />
                                {getDaysUntilDue(assignment.dueDate)}
                              </div>
                              <div className="flex items-center text-gray-500">
                                <Clock className="h-4 w-4 mr-1" />
                                {assignment.estimatedTime} min
                              </div>
                              {assignment.link && assignment.link !== "#" && (
                                <Link 
                                  href={assignment.link} 
                                  target="_blank"
                                  className="flex items-center text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="tasks">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Add task via natural language (e.g. 'Math homework due tomorrow 60min high priority')"
                      value={naturalLanguageInput}
                      onChange={(e) => setNaturalLanguageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNaturalLanguageSubmit()}
                    />
                  </div>
                  <Button onClick={handleNaturalLanguageSubmit} disabled={!naturalLanguageInput.trim()}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Parse
                  </Button>
                </div>

                <div className="bg-white rounded-lg shadow-sm border">
                  {assignments.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No tasks yet. Add some using the input above or the Add Task button.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{assignment.title}</h3>
                            <p className="text-sm text-gray-600">{assignment.course}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>{getDaysUntilDue(assignment.dueDate)}</span>
                              <span>{assignment.estimatedTime}min</span>
                              <span>Priority: {assignment.priorityScore?.toFixed(2) || 'N/A'}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(assignment.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  {getSmartRecommendations().length > 0 ? (
                    <div className="space-y-4">
                      {getSmartRecommendations().map((recommendation, index) => (
                        <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        Add some tasks to get AI-powered recommendations.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Export Tasks</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Download all tasks as a text file
                    </p>
                    <Button variant="outline" onClick={exportTasks}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Tasks
                    </Button>
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium">Data Management</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Clear deleted tasks history ({deletedTaskIds.size} deleted)
                    </p>
                    <Button variant="outline" onClick={clearDeletedTasks} disabled={deletedTaskIds.size === 0}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Deleted Tasks
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title*
              </Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="col-span-3"
                placeholder="Task title"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="course" className="text-right">
                Course
              </Label>
              <Input
                id="course"
                value={newTask.course}
                onChange={(e) => setNewTask({...newTask, course: e.target.value})}
                className="col-span-3"
                placeholder="Course name"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimatedTime" className="text-right">
                Est. Time (min)
              </Label>
              <div className="col-span-3 space-y-2">
                <Slider
                  id="estimatedTime"
                  value={[newTask.estimatedTime]}
                  max={240}
                  step={15}
                  onValueChange={(val) => setNewTask({...newTask, estimatedTime: val[0]})}
                />
                <span className="text-sm text-gray-500">
                  {newTask.estimatedTime} minutes
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="impact" className="text-right">
                Impact (1-5)
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    variant={newTask.impact === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewTask({...newTask, impact: num})}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="col-span-3"
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddManualTask}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
