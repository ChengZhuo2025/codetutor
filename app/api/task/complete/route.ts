import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createCompleteTaskPostHandler } from "@/server/modules/tasks/route-handler"
import { completeTask } from "@/server/modules/tasks/service"

const postHandler = createCompleteTaskPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  completeTask,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
