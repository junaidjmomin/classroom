import axios from "axios";
import { google } from "googleapis";
import { getToken } from "next-auth/jwt";

const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
];

export const fetchClassroomAssignments = async (req: any) => {
  try {
    const token = await getToken({ req });

    if (!token) {
      console.warn("❌ No token found");
      return [];
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token.accessToken });

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    console.log("📚 Fetching courses...");
    const res = await classroom.courses.list({ courseStates: ["ACTIVE"] });
    const courses = res.data.courses ?? [];

    console.log(`📚 Found ${courses.length} total courses`);

    const activeCourses = courses.filter(Boolean);
    if (!activeCourses.length) {
      console.warn("⚠️ No active courses found");
      return [];
    }

    const assignmentPromises = activeCourses.map(async (course) => {
      if (!course.id) return [];

      const courseWorkResponse = await classroom.courses.courseWork.list({
        courseId: course.id,
        orderBy: "dueDate desc",
      });

      const assignments = courseWorkResponse?.data?.courseWork ?? [];

      return assignments
        .filter((a) => a?.dueDate) // Only those with due dates
        .map((assignment) => {
          const due = new Date(
            assignment.dueDate!.year!,
            (assignment.dueDate!.month! - 1),
            assignment.dueDate!.day!
          );
          const now = new Date();

          const timeLeft = due.getTime() - now.getTime();
          const daysLeft = timeLeft / (1000 * 60 * 60 * 24);
          const priorityScore = Math.max(0, 100 - daysLeft * 10); // Clamp to 0 min

          return {
            id: assignment.id,
            title: assignment.title ?? "Untitled",
            dueDate: due,
            description: assignment.description ?? "",
            courseTitle: course.name ?? "Untitled Course",
            priorityScore: Math.round(priorityScore),
            alternateLink: assignment.alternateLink ?? "#",
          };
        });
    });

    const assignmentResults = await Promise.allSettled(assignmentPromises);

    const allAssignments = assignmentResults.flatMap((result) => {
      if (result.status === "fulfilled") return result.value.filter(Boolean);
      console.warn("⚠️ Failed to fetch some assignments", result.reason);
      return [];
    });

    console.log("✅ Fetched assignments:", allAssignments.length);

    return allAssignments;
  } catch (error) {
    console.error("🔥 Error fetching assignments:", error);
    return [];
  }
};
