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

export async function fetchClassroomAssignments(accessToken: string): Promise<Assignment[]> {
  try {
    // Fetch courses
    const coursesResponse = await fetch("https://classroom.googleapis.com/v1/courses", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!coursesResponse.ok) {
      throw new Error("Failed to fetch courses")
    }

    const coursesData = await coursesResponse.json()
    const courses: Course[] = coursesData.courses || []

    const allAssignments: Assignment[] = []
    const courseColors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-teal-500",
    ]

    // Fetch assignments for each course
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i]

      try {
        const assignmentsResponse = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json()
          const courseWork: CourseWork[] = assignmentsData.courseWork || []

          courseWork.forEach((work) => {
            let dueDate = ""
            let dueTime = "11:59 PM"
            let status: "pending" | "urgent" | "completed" = "pending"

            if (work.dueDate) {
              const due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day)
              dueDate = due.toISOString().split("T")[0]

              // Check if assignment is urgent (due within 2 days)
              const today = new Date()
              const diffTime = due.getTime() - today.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

              if (diffDays <= 2 && diffDays >= 0) {
                status = "urgent"
              }
            }

            if (work.dueTime) {
              const hours = work.dueTime.hours || 23
              const minutes = work.dueTime.minutes || 59
              const period = hours >= 12 ? "PM" : "AM"
              const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
              dueTime = `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
            }

            allAssignments.push({
              id: work.id,
              title: work.title,
              course: course.name,
              courseColor: courseColors[i % courseColors.length],
              dueDate,
              dueTime,
              status,
              description: work.description || "No description available",
              link: work.alternateLink,
            })
          })
        }
      } catch (error) {
        console.error(`Error fetching assignments for course ${course.name}:`, error)
      }
    }

    // Sort assignments by due date
    return allAssignments.sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  } catch (error) {
    console.error("Error fetching classroom assignments:", error)
    return []
  }
}
