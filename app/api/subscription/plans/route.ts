import { createSubscriptionPlansGetHandler } from "@/server/modules/payments/route-handler"
import { getPublicSubscriptionPlans } from "@/server/modules/payments/service"

const handler = createSubscriptionPlansGetHandler({
  getPublicSubscriptionPlans,
})

export const GET = handler
