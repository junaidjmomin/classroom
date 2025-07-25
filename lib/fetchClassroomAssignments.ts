// This is the function you'll implement to replace the mock data
export async function fetchClassroomAssignments(accessToken: string) {
  try {
    // Fetch courses
    const coursesResponse = await fetch("https://classroom.googleapis.com/v1/courses", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    const coursesData = await coursesResponse.json()
    const courses = coursesData.courses || []

    const allAssignments = []

    // Fetch assignments for each course
    for (const course of courses) {
      const assignmentsResponse = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json()
        const courseWork = assignmentsData.courseWork || []

        courseWork.forEach((work) => {
          let dueDate = ""
          let status = "pending"

          if (work.dueDate) {
            const due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day)
            dueDate = due.toISOString().split("T")[0]

            // Mark as urgent if due within 2 days
            const today = new Date()
            const diffTime = due.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays <= 2 && diffDays >= 0) {
              status = "urgent"
            }
          }

          allAssignments.push({
            id: work.id,
            title: work.title,
            course: course.name,
            dueDate,
            status,
            link: work.alternateLink,
          })
        })
      }
    }

    // Sort by due date
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
