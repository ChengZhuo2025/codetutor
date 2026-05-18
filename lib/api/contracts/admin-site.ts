export const SITE_ARTICLE_SLUGS = [
  "about_us",
  "user_agreement",
  "privacy_policy",
] as const

export type SiteArticleSlug = (typeof SITE_ARTICLE_SLUGS)[number]

export type SiteInformation = {
  logoUrl: string | null
  siteName: string
  siteSubtitle: string
  siteSlogan: string
  siteDescription: string
  seoKeywords: string[]
  icpNumber: string | null
  copyright: string
  version: string
  updatedAt: string | null
  updatedByAdminId?: string | null
}

export type AdminSiteInformationResponseData = SiteInformation

export type UpdateSiteInformationRequest = {
  logoUrl?: string | null
  siteName?: string
  siteSubtitle?: string
  siteSlogan?: string
  siteDescription?: string
  seoKeywords?: string[]
  icpNumber?: string | null
  copyright?: string
  version?: string
}

export type SiteArticle = {
  slug: SiteArticleSlug
  title: string
  contentMarkdown: string
  effectiveDate: string | null
  updatedAt: string | null
  updatedByAdminId?: string | null
}

export type PublicSiteArticle = Omit<SiteArticle, "updatedByAdminId">

export type AdminSiteArticleResponseData = SiteArticle

export type AdminSiteArticleListResponseData = {
  items: SiteArticle[]
}

export type UpdateSiteArticleRequest = {
  title?: string
  contentMarkdown?: string
  effectiveDate?: string | null
}

export type PublicSiteResponseData = {
  information: SiteInformation
  articles: {
    aboutUs: PublicSiteArticle
    userAgreement: PublicSiteArticle
    privacyPolicy: PublicSiteArticle
  }
}
