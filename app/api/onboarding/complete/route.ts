import type { NextRequest } from "next/server"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import { createCompleteOnboardingPostHandler } from "@/server/modules/onboarding/route-handler"
import { completeOnboarding } from "@/server/modules/onboarding/service"

const postHandler = createCompleteOnboardingPostHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  completeOnboarding,
})

export async function POST(request: NextRequest) {
  return postHandler(request)
}
