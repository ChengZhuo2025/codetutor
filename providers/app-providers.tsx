"use client"

import { Analytics } from "@vercel/analytics/next"

type AppProvidersProps = {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Analytics />
    </>
  )
}
