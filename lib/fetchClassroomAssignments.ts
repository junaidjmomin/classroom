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
}

interface Course {
  id: string
  name: string
  section?: string
  room?: string
  courseState?: string
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

export async function fetchClassroomAssignments(accessToken: string): Promise<Assignment[]> {
  console.log("🚀 Starting comprehensive assignment fetch...");

  if (!accessToken) {
    console.error("❌ No access token provided");
    return [];
  }

  try {
    // First, fetch all courses
    console.log("📚 Fetching courses...");
    const coursesResponse = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
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
    const courses: Course[] = coursesData.courses || [];
    
    console.log(`📚 Found ${courses.length} active courses`);
    
    if (courses.length === 0) {
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

    // Process each course
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      console.log(`\n📖 Processing course: ${course.name} (${course.id})`);

      try {
        // Fetch course work (assignments)
        const courseWorkUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`;
        console.log(`📝 Fetching course work from: ${courseWorkUrl}`);
        
        const assignmentsResponse = await fetch(courseWorkUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!assignmentsResponse.ok) {
          const errorText = await assignmentsResponse.text();
          console.warn(`⚠️ Failed to fetch assignments for ${course.name}:`, {
            status: assignmentsResponse.status,
            error: errorText
          });
          continue; // Skip this course but continue with others
        }

        const assignmentsData = await assignmentsResponse.json();
        const courseWork: CourseWork[] = assignmentsData.courseWork || [];
        
        console.log(`📝 Found ${courseWork.length} assignments in ${course.name}`);

        if (courseWork.length === 0) {
          console.log(`📝 No assignments found for ${course.name}`);
          continue;
        }

        // Process each assignment
        for (const work of courseWork) {
          console.log(`\n📋 Processing: ${work.title}`);
          
          try {
            // Get submission status for this assignment
            let submissionStatus = "pending";
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
                  console.log(`📤 Submission state: ${submission.state}`);
                  
                  if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
                    submissionStatus = "completed";
                  }
                }
              }
            } catch (submissionError) {
              console.warn(`⚠️ Could not fetch submission status for ${work.title}:`, submissionError);
            }

            // Parse due date and time
            let dueDate = "";
            let dueTime = "11:59 PM";
            let status = submissionStatus;

            if (work.dueDate) {
              const due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
              dueDate = due.toISOString().split("T")[0];

              // Calculate urgency only if not already completed
              if (status !== "completed") {
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Reset time for accurate day comparison
                
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`📅 Days until due: ${diffDays}`);

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
              status: status as "pending" | "urgent" | "completed",
              description: work.description || "No description available",
              link: work.alternateLink,
            };

            console.log(`✅ Created assignment:`, {
              title: assignment.title,
              course: assignment.course,
              status: assignment.status,
              dueDate: assignment.dueDate
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

    console.log(`\n🎯 Total assignments collected: ${allAssignments.length}`);

    // Sort assignments: completed last, then by due date
    const sortedAssignments = allAssignments.sort((a, b) => {
      // Completed assignments go to the end
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      
      // Among non-completed, sort by due date
      if (a.status !== "completed" && b.status !== "completed") {
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

    console.log("🎯 Final sorted assignments:", sortedAssignments.map(a => ({
      title: a.title,
      status: a.status,
      dueDate: a.dueDate
    })));

    return sortedAssignments;

  } catch (error) {
    console.error("💥 Fatal error in fetchClassroomAssignments:", error);
    
    // Provide specific error messages
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
