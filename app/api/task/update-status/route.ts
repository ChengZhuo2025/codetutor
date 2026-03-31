import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createUpdateTaskStatusPostHandler } from "@/server/modules/tasks/route-handler"
import { updateTaskStatus } from "@/server/modules/tasks/service"

const postHandler = createUpdateTaskStatusPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  updateTaskStatus,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
