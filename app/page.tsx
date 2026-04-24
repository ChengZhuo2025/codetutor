import { LandingPage } from "@/features/marketing/pages/landing-page"

// Force dynamic rendering so that marketing footer (including ICP number) 
// and other changes are immediately visible without cache issues.
// This is especially important for a marketing landing page.
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return <LandingPage />
}
