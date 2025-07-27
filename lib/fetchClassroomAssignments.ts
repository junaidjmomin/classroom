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
  estimatedTime: number
  impact: number
  contextSwitchCost: number
  priorityScore?: number
  workType: string
  submissionStatus: string
  createdAt: string
}

interface Course {
  id: string
  name: string
  section?: string
  room?: string
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
}

// Priority calculation utilities
export class PriorityCalculator {
  static calculatePriority(assignment: any): number {
    const {
      dueDate,
      estimatedTime = 60,
      impact = 3,
      contextSwitchCost = 2,
    } = assignment;

    if (!dueDate) return 0.5;

    const now = new Date();
    const due = new Date(dueDate);
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Time pressure factor (0.1 to 2.0)
    const timePressure = Math.max(0.1, Math.min(2.0, 48 / Math.max(1, hoursUntilDue)));
    
    // Task complexity factor (0.5 to 2.0)
    const complexity = Math.max(0.5, Math.min(2.0, estimatedTime / 60));
    
    // Impact factor (0.5 to 2.0)
    const impactFactor = Math.max(0.5, Math.min(2.0, impact / 3));
    
    // Context switch penalty (0.8 to 1.5)
    const contextPenalty = Math.max(0.8, Math.min(1.5, contextSwitchCost / 3));

    return (timePressure * complexity * impactFactor * contextPenalty) / 4;
  }
}

// AI-powered natural language task parser
export class AITaskParser {
  static parseNaturalLanguage(input: string): Assignment[] {
    try {
      const tasks: Assignment[] = [];
      const lines = input.split(/[;\n]/).filter(line => line.trim());

      lines.forEach((line, index) => {
        const parsed = this.parseTaskLine(line.trim(), index);
        if (parsed) tasks.push(parsed);
      });

      return tasks;
    } catch (error) {
      console.error("Error parsing natural language input:", error);
      return [];
    }
  }

  private static parseTaskLine(line: string, index: number): Assignment | null {
    if (!line) return null;

    // Extract title (everything before first keyword)
    const keywords = ['due', 'priority', 'impact', 'time', 'min', 'hour'];
    let title = line;
    let remainingText = '';

    for (const keyword of keywords) {
      const keywordIndex = line.toLowerCase().indexOf(keyword);
      if (keywordIndex !== -1) {
        title = line.substring(0, keywordIndex).trim();
        remainingText = line.substring(keywordIndex);
        break;
      }
    }

    if (!title) {
      title = line.split(' ').slice(0, 5).join(' '); // First 5 words as fallback
    }

    // Extract due date
    let dueDate = '';
    const datePatterns = [
      /due\s+(today|tomorrow|yesterday)/i,
      /due\s+in\s+(\d+)\s*(day|hour)s?/i,
      /due\s+(\d{1,2}\/\d{1,2})/i,
      /(\d{4}-\d{2}-\d{2})/,
    ];

    for (const pattern of datePatterns) {
      const match = remainingText.match(pattern);
      if (match) {
        if (match[1] === 'today') {
          dueDate = new Date().toISOString().split('T')[0];
        } else if (match[1] === 'tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString().split('T')[0];
        } else if (match[1] === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          dueDate = yesterday.toISOString().split('T')[0];
        } else if (match[1] && match[2]) {
          const days = parseInt(match[1]);
          const future = new Date();
          if (match[2].toLowerCase().startsWith('day')) {
            future.setDate(future.getDate() + days);
          } else {
            future.setHours(future.getHours() + days);
          }
          dueDate = future.toISOString().split('T')[0];
        } else {
          dueDate = match[1] || match[0];
        }
        break;
      }
    }

    // Extract time estimate
    let estimatedTime = 60; // Default 1 hour
    const timeMatch = remainingText.match(/(\d+)\s*(min|hour|hr)s?/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      if (timeMatch[2].toLowerCase().startsWith('hour') || timeMatch[2].toLowerCase() === 'hr') {
        estimatedTime = value * 60;
      } else {
        estimatedTime = value;
      }
    }

    // Extract priority/impact
    let impact = 3; // Default medium
    const priorityPatterns = [
      /priority\s*(high|medium|low)/i,
      /impact\s*(high|medium|low)/i,
      /(urgent|important|critical)/i,
      /(low|easy|simple)/i,
    ];

    for (const pattern of priorityPatterns) {
      const match = remainingText.match(pattern);
      if (match) {
        const priority = match[1].toLowerCase();
        if (priority === 'high' || priority === 'urgent' || priority === 'important' || priority === 'critical') {
          impact = 5;
        } else if (priority === 'low' || priority === 'easy' || priority === 'simple') {
          impact = 2;
        }
        break;
      }
    }

    const task: Assignment = {
      id: `parsed-${Date.now()}-${index}`,
      title: title || 'Untitled Task',
      course: 'Manual Entry',
      courseColor: 'bg-purple-500',
      dueDate,
      dueTime: '11:59 PM',
      status: 'pending',
      description: line,
      link: '#',
      estimatedTime,
      impact,
      contextSwitchCost: 2,
      workType: 'ASSIGNMENT',
      submissionStatus: 'NEW',
      createdAt: new Date().toISOString(),
    };

    task.priorityScore = PriorityCalculator.calculatePriority(task);
    return task;
  }

  static getSmartRecommendations(assignments: Assignment[]): string[] {
    const recommendations: string[] = [];
    
    if (assignments.length === 0) return recommendations;

    // Find urgent tasks
    const urgentTasks = assignments.filter(a => {
      if (!a.dueDate) return false;
      const hoursUntilDue = (new Date(a.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
      return hoursUntilDue <= 24;
    });

    if (urgentTasks.length > 0) {
      recommendations.push(`🚨 You have ${urgentTasks.length} task(s) due within 24 hours. Focus on these first.`);
    }

    // Find quick wins
    const quickWins = assignments.filter(a => a.estimatedTime <= 30);
    if (quickWins.length > 0) {
      recommendations.push(`⚡ Consider completing ${quickWins.length} quick task(s) (≤30 min) to build momentum.`);
    }

    // Time blocking suggestion
    const totalTime = assignments.reduce((sum, a) => sum + (a.estimatedTime || 0), 0);
    const hours = Math.ceil(totalTime / 60);
    recommendations.push(`📅 Block ${hours} hours in your calendar to complete all tasks.`);

    // Context switching advice
    const courses = [...new Set(assignments.map(a => a.course))];
    if (courses.length > 3) {
      recommendations.push(`🧠 You have tasks from ${courses.length} different courses. Group similar tasks to reduce context switching.`);
    }

    return recommendations;
  }
}

export async function fetchClassroomAssignments(accessToken: string): Promise<Assignment[]> {
  try {
    console.log("🚀 Starting enhanced assignment fetch with AI prioritization...");
    
    // Fetch courses
    const coursesResponse = await fetch("https://classroom.googleapis.com/v1/courses", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!coursesResponse.ok) {
      const errorText = await coursesResponse.text();
      console.error("Failed to fetch courses:", coursesResponse.status, errorText);
      throw new Error(`Failed to fetch courses: ${coursesResponse.status}`);
    }

    const coursesData = await coursesResponse.json();
    const courses: Course[] = coursesData.courses || [];

    console.log("📚 Fetched courses:", courses.length);
    
    if (courses.length === 0) {
      console.log("📚 Found 0 total courses");
      console.log("📚 Found 0 ACTIVE courses");
      console.log("⚠️ No active courses found");
      return [];
    }

    const activeCourses = courses.filter(course => course.id && course.name);
    console.log("📚 Found", activeCourses.length, "ACTIVE courses");

    if (activeCourses.length === 0) {
      console.log("⚠️ No active courses found");
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
    ];

    // Fetch assignments for each course
    for (let i = 0; i < activeCourses.length; i++) {
      const course = activeCourses[i];

      try {
        console.log(`📚 Fetching assignments for course: ${course.name} (${course.id})`);
        
        const assignmentsResponse = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          const courseWork: CourseWork[] = assignmentsData.courseWork || [];

          console.log(`📝 Found ${courseWork.length} assignments in ${course.name}`);

          courseWork.forEach((work) => {
            let dueDate = "";
            let dueTime = "11:59 PM";
            let status: "pending" | "urgent" | "completed" = "pending";

            if (work.dueDate) {
              const due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
              dueDate = due.toISOString().split("T")[0];

              // Check if assignment is urgent (due within 2 days)
              const today = new Date();
              const diffTime = due.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays <= 2 && diffDays >= 0) {
                status = "urgent";
              }
            }

            if (work.dueTime) {
              const hours = work.dueTime.hours || 23;
              const minutes = work.dueTime.minutes || 59;
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
              estimatedTime: 60, // Default 1 hour
              impact: 3, // Default medium impact
              contextSwitchCost: 2, // Default medium context switch cost
              workType: "ASSIGNMENT",
              submissionStatus: "NEW",
              createdAt: new Date().toISOString(),
            };

            // Calculate AI priority score
            assignment.priorityScore = PriorityCalculator.calculatePriority(assignment);

            allAssignments.push(assignment);
          });
        } else {
          console.warn(`⚠️ Failed to fetch assignments for course ${course.name}:`, assignmentsResponse.status);
        }
      } catch (error) {
        console.error(`Error fetching assignments for course ${course.name}:`, error);
      }
    }

    console.log("✅ Total assignments fetched:", allAssignments.length);

    // Sort assignments by AI priority score (highest first)
    const sortedAssignments = allAssignments.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    
    console.log("🧠 Applied AI prioritization to", sortedAssignments.length, "assignments");

    return sortedAssignments;
  } catch (error) {
    console.error("Error fetching classroom assignments:", error);
    throw error;
  }
}
