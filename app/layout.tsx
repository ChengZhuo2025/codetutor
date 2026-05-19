import type { Metadata } from 'next'
import {
  APP_DESCRIPTION,
  APP_LANG,
  APP_TITLE,
} from '@/constants/app'
import { DEFAULT_PUBLIC_SITE } from '@/features/site/data/default-site'
import type { PublicSiteResponseData } from '@/lib/api/contracts/admin-site'
import { loadPublicSite, loadSiteInformation } from '@/server/modules/admin-site/service'
import { AppProviders } from '@/providers/app-providers'
import './globals.css'

const DEFAULT_ICONS: Metadata["icons"] = {
  icon: [
    {
      url: '/icon-light-32x32.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      url: '/icon-dark-32x32.png',
      media: '(prefers-color-scheme: dark)',
    },
    {
      url: '/icon.svg',
      type: 'image/svg+xml',
    },
  ],
  apple: '/apple-icon.png',
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const information = await loadSiteInformation()
    return {
      title: `${information.siteName} — ${information.siteSubtitle}`,
      description: information.siteDescription,
      keywords: information.seoKeywords,
      icons: DEFAULT_ICONS,
    }
  } catch {
    return {
      title: APP_TITLE,
      description: APP_DESCRIPTION,
      keywords: DEFAULT_PUBLIC_SITE.information.seoKeywords,
      icons: DEFAULT_ICONS,
    }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let initialPublicSite: PublicSiteResponseData | undefined

  try {
    initialPublicSite = await loadPublicSite()
  } catch {
    initialPublicSite = undefined
  }

  return (
    <html
      lang={APP_LANG}
      className="dark"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <AppProviders initialPublicSite={initialPublicSite}>{children}</AppProviders>
      </body>
    </html>
  )
}
