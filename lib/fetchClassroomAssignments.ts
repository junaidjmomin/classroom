// lib/fetchClassroomAssignments.ts
interface Assignment {
  id: string
  title: string
  course: string
  courseColor: string
  dueDate: string
  dueTime: string
  status: "pending" | "urgent" | "completed"
  description: string
  link: string
  // Enhanced fields for AI prioritization
  estimatedTime: number // in minutes
  impact: number // 1-5 scale
  contextSwitchCost: number // 1-5 scale
  priorityScore?: number
  workType?: string
  submissionStatus?: string
}

interface Course {
  id: string
  name: string
  section?: string
  room?: string
  courseState?: string
  enrollmentCode?: string
}

interface CourseWork {
  id: string
  title: string
  description?: string
  dueDate?: {
    year: number
    month: number
    day: number
  }
  dueTime?: {
    hours: number
    minutes: number
  }
  alternateLink: string
  courseId: string
  creationTime?: string
  updateTime?: string
  state?: string
  workType?: string
}

interface StudentSubmission {
  id: string
  courseWorkId: string
  userId: string
  creationTime: string
  updateTime: string
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT'
  late?: boolean
  draftGrade?: number
  assignedGrade?: number
}

// AI-Enhanced Assignment Estimator
class AssignmentEstimator {
  static estimateTimeAndImpact(courseWork: CourseWork, courseName: string): {
    estimatedTime: number,
    impact: number,
    contextSwitchCost: number
  } {
    const title = courseWork.title.toLowerCase();
    const description = (courseWork.description || '').toLowerCase();
    const workType = courseWork.workType || 'ASSIGNMENT';
    
    let estimatedTime = 90; // default 90 minutes
    let impact = 3; // default medium impact
    let contextSwitchCost = 2; // default medium context switch cost
    
    // Time estimation based on keywords and work type
    if (workType === 'MULTIPLE_CHOICE_QUESTION' || workType === 'SHORT_ANSWER_QUESTION') {
      estimatedTime = 30;
      impact = 2;
      contextSwitchCost = 1;
    } else if (title.includes('quiz') || title.includes('test')) {
      estimatedTime = 60;
      impact = 4;
      contextSwitchCost = 2;
    } else if (title.includes('essay') || title.includes('report') || title.includes('research')) {
      estimatedTime = 240;
      impact = 5;
      contextSwitchCost = 4;
    } else if (title.includes('homework') || title.includes('problem set')) {
      estimatedTime = 120;
      impact = 3;
      contextSwitchCost = 2;
    } else if (title.includes('reading') || title.includes('chapter')) {
      estimatedTime = 45;
      impact = 2;
      contextSwitchCost = 1;
    } else if (title.includes('lab') || title.includes('experiment')) {
      estimatedTime = 180;
      impact = 4;
      contextSwitchCost = 3;
    } else if (title.includes('presentation') || title.includes('project')) {
      estimatedTime = 300;
      impact = 5;
      contextSwitchCost = 4;
    }
    
    // Adjust based on course subject
    const courseNameLower = courseName.toLowerCase();
    if (courseNameLower.includes('math') || courseNameLower.includes('calculus') || 
        courseNameLower.includes('algebra') || courseNameLower.includes('statistics')) {
      contextSwitchCost = Math.max(contextSwitchCost, 3); // Math requires focus
    } else if (courseNameLower.includes('english') || courseNameLower.includes('literature') || 
               courseNameLower.includes('writing')) {
      estimatedTime *= 1.2; // Writing takes longer
      contextSwitchCost = Math.max(contextSwitchCost, 2);
    } else if (courseNameLower.includes('science') || courseNameLower.includes('physics') || 
               courseNameLower.includes('chemistry') || courseNameLower.includes('biology')) {
      contextSwitchCost = Math.max(contextSwitchCost, 3); // Science requires focus
    }
    
    // Description-based adjustments
    if (description.includes('short') || description.includes('brief')) {
      estimatedTime *= 0.7;
      impact = Math.max(impact - 1, 1);
    } else if (description.includes('detailed') || description.includes('comprehensive')) {
      estimatedTime *= 1.5;
      impact = Math.min(impact + 1, 5);
    }
    
    return {
      estimatedTime: Math.round(estimatedTime),
      impact: Math.max(1, Math.min(5, impact)),
      contextSwitchCost: Math.max(1, Math.min(5, contextSwitchCost))
    };
  }
}

// Priority Calculator
class PriorityCalculator {
  static weights = {
    alpha: 0.4,   // Urgency weight
    beta: 0.3,    // Time weight
    gamma: 0.2,   // Momentum weight
    delta: 0.3,   // Impact weight
    theta: 0.2    // Context switch penalty
  };

  static calculatePriority(assignment: Assignment): number {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const daysLeft = Math.max(1, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const urgency = 1 / daysLeft;
    const timeComponent = 1 / Math.max(0.5, assignment.estimatedTime / 60); // Convert to hours
    const momentumBoost = assignment.estimatedTime <= 60 ? 10 : assignment.estimatedTime <= 120 ? 6 : 3;
    const impact = assignment.impact;
    const contextSwitchCost = assignment.contextSwitchCost;

    const priority = 
      this.weights.alpha * urgency +
      this.weights.beta * timeComponent +
      this.weights.gamma * (momentumBoost / 10) +
      this.weights.delta * (impact / 5) -
      this.weights.theta * (contextSwitchCost / 5);

    return Math.max(0, priority);
  }

  static getRecommendation(assignment: Assignment, rank: number): string {
    const priority = this.calculatePriority(assignment);
    const isQuickWin = assignment.estimatedTime <= 60;
    const isUrgent = assignment.status === 'urgent';
    
    if (rank === 1) {
      if (isQuickWin) {
        return `Start with "${assignment.title}" - it's a quick win (${assignment.estimatedTime}min) that will build momentum for tougher tasks ahead.`;
      } else if (isUrgent) {
        return `Prioritize "${assignment.title}" immediately - it's due soon and requires ${assignment.estimatedTime} minutes of focused work.`;
      } else {
        return `Begin with "${assignment.title}" - it has the highest priority score (${priority.toFixed(2)}) based on your current workload.`;
      }
    } else if (rank === 2) {
      return `Follow up with "${assignment.title}" - maintain your momentum after completing the first task.`;
    } else {
      return `Schedule "${assignment.title}" for later - focus on higher priority items first to maximize productivity.`;
    }
  }
}

export async function fetchClassroomAssignments(accessToken: string): Promise<Assignment[]> {
  console.log("🚀 Starting enhanced assignment fetch with AI prioritization...");

  if (!accessToken) {
    console.error("❌ No access token provided");
    return [];
  }

  try {
    // Fetch courses
    console.log("📚 Fetching courses...");
    const coursesResponse = await fetch(
      "https://classroom.googleapis.com/v1/courses",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!coursesResponse.ok) {
      const errorText = await coursesResponse.text();
      console.error("❌ Failed to fetch courses:", {
        status: coursesResponse.status,
        error: errorText
      });
      
      if (coursesResponse.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      } else if (coursesResponse.status === 403) {
        throw new Error("Permission denied. Please ensure Classroom API access is granted.");
      }
      
      throw new Error(`Failed to fetch courses: ${coursesResponse.status}`);
    }

    const coursesData = await coursesResponse.json();
    const allCourses: Course[] = coursesData.courses || [];
    
    console.log(`📚 Found ${allCourses.length} total courses`);
    
    // Filter for active courses
    const activeCourses = allCourses.filter(course => course.courseState === 'ACTIVE');
    console.log(`📚 Found ${activeCourses.length} ACTIVE courses`);
    
    if (activeCourses.length === 0) {
      console.warn("⚠️ No active courses found");
      return [];
    }

    const allAssignments: Assignment[] = [];
    const courseColors = [
      "bg-blue-500",
      "bg-green-500", 
      "bg-purple-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-lime-500"
    ];

    // Process each active course
    for (let i = 0; i < activeCourses.length; i++) {
      const course = activeCourses[i];
      console.log(`\n📖 Processing course: ${course.name} (${course.id})`);

      try {
        // Fetch course work
        const courseWorkUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`;
        const assignmentsResponse = await fetch(courseWorkUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!assignmentsResponse.ok) {
          console.warn(`⚠️ Failed to fetch assignments for ${course.name}: ${assignmentsResponse.status}`);
          continue;
        }

        const assignmentsData = await assignmentsResponse.json();
        const courseWork: CourseWork[] = assignmentsData.courseWork || [];
        
        console.log(`📝 Found ${courseWork.length} total assignments in ${course.name}`);

        if (courseWork.length === 0) {
          continue;
        }

        // Filter for published assignments
        const publishedWork = courseWork.filter(work => work.state === 'PUBLISHED');
        console.log(`📝 Found ${publishedWork.length} PUBLISHED assignments in ${course.name}`);

        // Process each published assignment
        for (const work of publishedWork) {
          try {
            // Get AI estimates for time, impact, and context switch cost
            const estimates = AssignmentEstimator.estimateTimeAndImpact(work, course.name);
            
            // Get submission status
            let submissionStatus = "pending";
            let status: "pending" | "urgent" | "completed" = "pending";
            
            try {
              const submissionsUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${work.id}/studentSubmissions?userId=me`;
              const submissionsResponse = await fetch(submissionsUrl, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (submissionsResponse.ok) {
                const submissionsData = await submissionsResponse.json();
                const submissions: StudentSubmission[] = submissionsData.studentSubmissions || [];
                
                if (submissions.length > 0) {
                  const submission = submissions[0];
                  submissionStatus = submission.state;
                  
                  if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
                    status = "completed";
                  }
                }
              }
            } catch (submissionError) {
              console.warn(`⚠️ Could not fetch submission status for ${work.title}`);
            }

            // Parse due date and determine urgency
            let dueDate = "";
            let dueTime = "11:59 PM";

            if (work.dueDate) {
              const due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
              dueDate = due.toISOString().split("T")[0];

              // Calculate urgency only if not completed
              if (status !== "completed") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                  status = "urgent"; // Overdue
                } else if (diffDays <= 2) {
                  status = "urgent"; // Due soon
                }
              }
            }

            if (work.dueTime) {
              const hours = work.dueTime.hours ?? 23;
              const minutes = work.dueTime.minutes ?? 59;
              const period = hours >= 12 ? "PM" : "AM";
              const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
              dueTime = `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
            }

            const assignment: Assignment = {
              id: work.id,
              title: work.title,
              course: course.name,
              courseColor: courseColors[i % courseColors.length],
              dueDate,
              dueTime,
              status,
              description: work.description || "No description available",
              link: work.alternateLink,
              estimatedTime: estimates.estimatedTime,
              impact: estimates.impact,
              contextSwitchCost: estimates.contextSwitchCost,
              workType: work.workType,
              submissionStatus
            };

            // Calculate priority score
            assignment.priorityScore = PriorityCalculator.calculatePriority(assignment);

            console.log(`✅ Created enhanced assignment:`, {
              title: assignment.title,
              course: assignment.course,
              status: assignment.status,
              estimatedTime: assignment.estimatedTime,
              impact: assignment.impact,
              contextSwitchCost: assignment.contextSwitchCost,
              priorityScore: assignment.priorityScore.toFixed(2)
            });

            allAssignments.push(assignment);

          } catch (workError) {
            console.error(`❌ Error processing assignment ${work.title}:`, workError);
          }
        }

      } catch (courseError) {
        console.error(`❌ Error processing course ${course.name}:`, courseError);
      }
    }

    console.log(`\n🎯 Total enhanced assignments collected: ${allAssignments.length}`);

    // Sort assignments by priority score (highest first), then by due date
    const sortedAssignments = allAssignments.sort((a, b) => {
      // Completed assignments go to the end
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      
      // Among non-completed, sort by priority score
      if (a.status !== "completed" && b.status !== "completed") {
        const priorityDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
        if (Math.abs(priorityDiff) > 0.01) return priorityDiff;
        
        // If priority scores are similar, sort by due date
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      // Among completed, sort by due date (most recent first)
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });

    console.log("🎯 Final AI-prioritized assignments:", sortedAssignments.slice(0, 5).map(a => ({
      title: a.title,
      status: a.status,
      priorityScore: a.priorityScore?.toFixed(2),
      estimatedTime: a.estimatedTime,
      impact: a.impact
    })));

    return sortedAssignments;

  } catch (error) {
    console.error("💥 Fatal error in enhanced fetchClassroomAssignments:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error("Your session has expired. Please sign in again.");
      } else if (error.message.includes('403')) {
        throw new Error("Access denied. Please ensure you've granted Classroom permissions.");
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error("Network error. Please check your internet connection.");
      }
    }
    
    throw error;
  }
}

// Export the classes for use in other components
export { AssignmentEstimator, PriorityCalculator };

// Natural Language Processing for task input
export class AITaskParser {
  static parseNaturalLanguage(input: string): Assignment[] {
    const tasks: Assignment[] = [];
    
    // Split input into potential tasks
    const sentences = input.split(/[.!?;]/).filter(s => s.trim());
    let taskCounter = 0;
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 10) continue; // Skip very short sentences
      
      const lowerSentence = trimmed.toLowerCase();
      
      // Skip if it doesn't look like a task
      if (!this.looksLikeTask(lowerSentence)) continue;
      
      const taskData = this.extractTaskData(trimmed, lowerSentence);
      
      tasks.push({
        id: `ai-parsed-${Date.now()}-${taskCounter++}`,
        title: taskData.title,
        course: taskData.course,
        courseColor: 'bg-indigo-500',
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        status: taskData.status,
        description: 'Parsed from natural language input',
        link: '#',
        estimatedTime: taskData.estimatedTime,
        impact: taskData.impact,
        contextSwitchCost: taskData.contextSwitchCost,
        workType: 'ASSIGNMENT',
        submissionStatus: 'NEW'
      });
    }
    
    // Add priority scores
    tasks.forEach(task => {
      task.priorityScore = PriorityCalculator.calculatePriority(task);
    });
    
    return tasks;
  }
  
  private static looksLikeTask(sentence: string): boolean {
    const taskIndicators = [
      'assignment', 'homework', 'essay', 'report', 'project', 'lab', 'quiz',
      'test', 'exam', 'reading', 'chapter', 'problem', 'write', 'complete',
      'finish', 'submit', 'due', 'deadline', 'study', 'prepare', 'research'
    ];
    
    return taskIndicators.some(indicator => sentence.includes(indicator));
  }
  
  private static extractTaskData(original: string, lower: string) {
    // Extract title (clean up the sentence)
    let title = original;
    if (title.startsWith('I have ') || title.startsWith('i have ')) {
      title = title.substring(7);
    }
    if (title.startsWith('I need to ') || title.startsWith('i need to ')) {
      title = title.substring(10);
    }
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Extract course if mentioned
    let course = 'General';
    const courseKeywords = ['physics', 'chemistry', 'biology', 'math', 'english', 'history', 'literature', 'calculus', 'algebra'];
    for (const keyword of courseKeywords) {
      if (lower.includes(keyword)) {
        course = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        break;
      }
    }
    
    // Extract due date
    let dueDate = new Date();
    let status: "pending" | "urgent" | "completed" = "pending";
    
    if (lower.includes('tomorrow')) {
      dueDate.setDate(dueDate.getDate() + 1);
      status = "urgent";
    } else if (lower.includes('today')) {
      status = "urgent";
    } else if (lower.includes('next week')) {
      dueDate.setDate(dueDate.getDate() + 7);
    } else if (lower.includes('this week')) {
      dueDate.setDate(dueDate.getDate() + 3);
    } else {
      dueDate.setDate(dueDate.getDate() + 5); // Default to 5 days
    }
    
    // Estimate time and complexity
    let estimatedTime = 90; // default
    let impact = 3; // default
    let contextSwitchCost = 2; // default
    
    if (lower.includes('quick') || lower.includes('short') || lower.includes('brief')) {
      estimatedTime = 30;
      impact = 2;
      contextSwitchCost = 1;
    } else if (lower.includes('long') || lower.includes('detailed') || lower.includes('comprehensive')) {
      estimatedTime = 180;
      impact = 4;
      contextSwitchCost = 3;
    } else if (lower.includes('essay') || lower.includes('report') || lower.includes('research')) {
      estimatedTime = 240;
      impact = 5;
      contextSwitchCost = 4;
    } else if (lower.includes('reading') || lower.includes('chapter')) {
      estimatedTime = 45;
      impact = 2;
      contextSwitchCost = 1;
    } else if (lower.includes('quiz') || lower.includes('test')) {
      estimatedTime = 60;
      impact = 4;
      contextSwitchCost = 2;
    } else if (lower.includes('lab') || lower.includes('experiment')) {
      estimatedTime = 150;
      impact = 4;
      contextSwitchCost = 3;
    } else if (lower.includes('project') || lower.includes('presentation')) {
      estimatedTime = 300;
      impact = 5;
      contextSwitchCost = 4;
    }
    
    return {
      title,
      course,
      dueDate: dueDate.toISOString().split('T')[0],
      dueTime: '11:59 PM',
      status,
      estimatedTime,
      impact,
      contextSwitchCost
    };
  }
  
  static getSmartRecommendations(assignments: Assignment[]): string[] {
    const recommendations: string[] = [];
    const sortedByPriority = [...assignments].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    
    if (sortedByPriority.length === 0) {
      return ["No assignments found. Great job staying on top of your work!"];
    }
    
    const quickWins = assignments.filter(a => a.estimatedTime <= 60 && a.status !== 'completed');
    const urgentTasks = assignments.filter(a => a.status === 'urgent' && a.status !== 'completed');
    const highImpactTasks = assignments.filter(a => a.impact >= 4 && a.status !== 'completed');
    
    if (quickWins.length > 0) {
      recommendations.push(`🚀 Start with quick wins: You have ${quickWins.length} tasks that take ≤60 minutes. Complete these first to build momentum!`);
    }
    
    if (urgentTasks.length > 0) {
      recommendations.push(`⚠️ Urgent attention needed: ${urgentTasks.length} assignments are due soon. Prioritize these immediately.`);
    }
    
    if (highImpactTasks.length > 0) {
      recommendations.push(`🎯 High-impact focus: ${highImpactTasks.length} assignments have high importance scores. These deserve your best effort.`);
    }
    
    // Time management recommendation
    const totalTime = assignments
      .filter(a => a.status !== 'completed')
      .reduce((sum, a) => sum + a.estimatedTime, 0);
    
    const hours = Math.ceil(totalTime / 60);
    recommendations.push(`⏰ Total workload: Approximately ${hours} hours of work remaining. Plan ${Math.ceil(hours / 7)} hours per day this week.`);
    
    // Context switching recommendation
    const subjects = [...new Set(assignments.map(a => a.course))];
    if (subjects.length > 3) {
      recommendations.push(`🧠 Minimize context switching: You have work across ${subjects.length} subjects. Try to batch similar tasks together.`);
    }
    
    return recommendations;
  }
}
