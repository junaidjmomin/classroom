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

export async function fetchClassroomAssignments(accessToken: string): Promise<Assignment[]> {
  console.log("🚀 Starting enhanced assignment fetch with debugging...");

  if (!accessToken) {
    console.error("❌ No access token provided");
    return [];
  }

  try {
    // First, fetch all courses (including inactive ones for debugging)
    console.log("📚 Fetching ALL courses (active and inactive)...");
    const allCoursesResponse = await fetch(
      "https://classroom.googleapis.com/v1/courses",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!allCoursesResponse.ok) {
      const errorText = await allCoursesResponse.text();
      console.error("❌ Failed to fetch courses:", {
        status: allCoursesResponse.status,
        error: errorText
      });
      
      if (allCoursesResponse.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      } else if (allCoursesResponse.status === 403) {
        throw new Error("Permission denied. Please ensure Classroom API access is granted.");
      }
      
      throw new Error(`Failed to fetch courses: ${allCoursesResponse.status}`);
    }

    const allCoursesData = await allCoursesResponse.json();
    const allCourses: Course[] = allCoursesData.courses || [];
    
    console.log(`📚 Found ${allCourses.length} total courses (all states)`);
    
    // Log course details for debugging
    allCourses.forEach((course, index) => {
      console.log(`📖 Course ${index + 1}: "${course.name}" (${course.id}) - State: ${course.courseState}`);
    });

    // Filter for active courses
    const activeCourses = allCourses.filter(course => course.courseState === 'ACTIVE');
    console.log(`📚 Found ${activeCourses.length} ACTIVE courses`);
    
    if (activeCourses.length === 0) {
      console.warn("⚠️ No active courses found");
      if (allCourses.length > 0) {
        console.warn("💡 You have courses, but they're not in ACTIVE state:");
        allCourses.forEach(course => {
          console.warn(`   - ${course.name}: ${course.courseState}`);
        });
      }
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
        // Fetch course work (assignments) with detailed debugging
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
        
        console.log(`📝 Raw response for ${course.name}:`, {
          hasCourseWork: !!assignmentsData.courseWork,
          courseWorkLength: courseWork.length,
          firstAssignment: courseWork[0] ? {
            title: courseWork[0].title,
            state: courseWork[0].state,
            workType: courseWork[0].workType
          } : null
        });

        if (courseWork.length === 0) {
          console.log(`📝 No course work found for ${course.name}`);
          continue;
        }

        // Log all assignments for debugging
        courseWork.forEach((work, index) => {
          console.log(`📋 Assignment ${index + 1}: "${work.title}" - State: ${work.state}, Type: ${work.workType}`);
        });

        // Filter for published assignments only
        const publishedWork = courseWork.filter(work => work.state === 'PUBLISHED');
        console.log(`📝 Found ${publishedWork.length} PUBLISHED assignments in ${course.name}`);

        if (publishedWork.length === 0) {
          console.log(`📝 No published assignments in ${course.name}`);
          continue;
        }

        // Process each published assignment
        for (const work of publishedWork) {
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
              } else {
                console.warn(`⚠️ Could not fetch submission status for ${work.title}: ${submissionsResponse.status}`);
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
            } else {
              console.log(`📅 No due date for: ${work.title}`);
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

    // Enhanced debugging summary
    console.log("📊 Assignment Collection Summary:");
    console.log(`   - Total courses found: ${allCourses.length}`);
    console.log(`   - Active courses: ${activeCourses.length}`);
    console.log(`   - Final assignments: ${allAssignments.length}`);
    
    if (allAssignments.length === 0) {
      console.log("🔍 Debugging tips:");
      console.log("   1. Check if your courses have published assignments");
      console.log("   2. Verify you're enrolled as a student (not just a teacher)");
      console.log("   3. Make sure assignments have due dates");
      console.log("   4. Try creating a test assignment in Google Classroom");
    }

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
