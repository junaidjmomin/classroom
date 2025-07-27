"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
} from "lucide-react";
import { fetchClassroomAssignments, PriorityCalculator, AITaskParser } from "@/lib/fetchClassroomAssignments";
import Link from "next/link";

export default function EnhancedClassroomDashboard() {
  const session = useSession();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("dashboard");
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

  useEffect(() => {
    async function loadAssignments() {
      if (session?.status === "authenticated") {
        setLoading(true);
        setError(null);
        if (session.data?.error === "RefreshAccessTokenError") {
          setError("Your session has expired. Please sign in again.");
          setLoading(false);
          return;
        }
        if (!session.data?.accessToken) {
          setError("No access token available. Please sign out and sign in again.");
          setLoading(false);
          return;
        }
        try {
          const fetchedAssignments = await fetchClassroomAssignments(session.data.accessToken);
          setAssignments(fetchedAssignments);
        } catch (err: any) {
          console.error("Failed to load assignments:", err);
          setError(err.message);
          setAssignments([]);
        } finally {
          setLoading(false);
        }
      } else if (session?.status === "unauthenticated") {
        setLoading(false);
      }
    }
    loadAssignments();
  }, [session?.status, session?.data?.accessToken]);

  const handleNaturalLanguageSubmit = () => {
    if (!naturalLanguageInput.trim()) return;
    const parsed = AITaskParser.parseNaturalLanguage(naturalLanguageInput);
    setAssignments((prev) => [...prev, ...parsed]);
    setNaturalLanguageInput("");
  };

  const handleAddManualTask = () => {
    if (!newTask.title.trim()) return;
    const task = {
      ...newTask,
      id: `manual-${Date.now()}`,
      courseColor: "bg-gray-500",
      status: "pending",
      link: "#",
      workType: "ASSIGNMENT",
      submissionStatus: "NEW",
    };
    task.priorityScore = PriorityCalculator.calculatePriority(task);
    setAssignments((prev) =>
      [...prev, task].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    );
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
    const body = assignments
      .map(
        (task, idx) =>
          `${idx + 1}. ${task.title} (${task.course})\n  Priority: ${
            task.priorityScore?.toFixed(2) ?? "N/A"
          }\n  Estimated Time: ${task.estimatedTime} min\n  Due: ${getDaysUntilDue(task.dueDate)}\n  Status: ${task.status}\n`
      )
      .join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ai-prioritized-tasks.txt";
    a.click();
  };

  const getSmartRecommendations = () => AITaskParser.getSmartRecommendations(assignments);

  const handleRefresh = () => window.location.reload();

  // UI Loading & Auth states
  if (session?.status === "loading" || loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your AI-powered assignments...</p>
        </div>
      </div>
    );

  if (session?.status === "unauthenticated")
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI‑Powered Task Prioritizer</h2>
          <p className="text-gray-600 mb-6">
            Connect with Google Classroom to get intelligent task prioritization using quantitative modeling
            and NLP.
          </p>
          <Button onClick={() => signIn("google")} size="lg">
            <BookOpen className="h-5 w-5 mr-2" />
            Sign in with Google
          </Button>
        </div>
      </div>
    );

  // Stats
  const urgentTasks = assignments.filter((a) => a.status === "urgent" && a.status !== "completed").length;
  const quickWins = assignments.filter((a) => a.estimatedTime <= 60 && a.status !== "completed").length;
  const avgPriority =
    assignments.length > 0
      ? assignments.reduce((sum, a) => sum + (a.priorityScore || 0), 0) / assignments.length
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p‑4">
      <div className="max‑w‑7xl mx-auto">
        {error && (
          <div className="bg‑red‑100 border border‑red‑400 text‑red‑700 px‑4 py‑3 rounded mb‑4">
            <AlertCircle className="h‑5 w‑5 mr‑2" />
            <span>Error: {error}</span>
          </div>
        )}

        {/* ... the rest of your JSX—for header, tabs, dashboard, etc. */}

        {/* Replace “{/* … the rest … */}” above with your existing JSX content, ensuring it's properly nested */}
      </div>
    </div>
  );
}
