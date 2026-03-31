import type { NextRequest } from "next/server"
import { createOnboardingPathOptionsGetHandler } from "@/server/modules/onboarding/route-handler"
import { getOnboardingPathOptionsData } from "@/server/modules/onboarding/service"

const getHandler = createOnboardingPathOptionsGetHandler({
  getOnboardingPathOptionsData,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}
