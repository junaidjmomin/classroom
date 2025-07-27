// app/api/fetch-classroom/route.ts
import { google } from "googleapis"

export async function POST(req: Request) {
  const { accessToken } = await req.json()

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const classroom = google.classroom({ version: "v1", auth })
  const res = await classroom.courses.list()

  return Response.json(res.data)
}
