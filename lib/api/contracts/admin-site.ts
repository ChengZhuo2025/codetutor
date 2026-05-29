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

export type SiteHelpItem = {
  id: string
  categoryId: string
  question: string
  answerMarkdown: string
  displayOrder: number
  enabled: boolean
  updatedAt: string | null
  updatedByAdminId?: string | null
}

export type SiteHelpCategory = {
  id: string
  title: string
  description: string | null
  iconKey: string
  displayOrder: number
  enabled: boolean
  updatedAt: string | null
  updatedByAdminId?: string | null
  items?: SiteHelpItem[]
}

export type PublicSiteHelpItem = Omit<SiteHelpItem, "updatedByAdminId">

export type PublicSiteHelpCategory = Omit<SiteHelpCategory, "updatedByAdminId" | "items"> & {
  items: PublicSiteHelpItem[]
}

export type AdminSiteHelpCategoryResponseData = SiteHelpCategory

export type AdminSiteHelpCategoryListResponseData = {
  items: SiteHelpCategory[]
}

export type AdminSiteHelpItemResponseData = SiteHelpItem

export type AdminSiteHelpItemListResponseData = {
  items: SiteHelpItem[]
}

export type CreateSiteHelpCategoryRequest = {
  title: string
  description?: string | null
  iconKey?: string
  displayOrder?: number
  enabled?: boolean
}

export type UpdateSiteHelpCategoryRequest = Partial<CreateSiteHelpCategoryRequest>

export type CreateSiteHelpItemRequest = {
  categoryId: string
  question: string
  answerMarkdown: string
  displayOrder?: number
  enabled?: boolean
}

export type UpdateSiteHelpItemRequest = {
  categoryId?: string
  question?: string
  answerMarkdown?: string
  displayOrder?: number
  enabled?: boolean
}

export type PublicSiteResponseData = {
  information: SiteInformation
  articles: {
    aboutUs: PublicSiteArticle
    userAgreement: PublicSiteArticle
    privacyPolicy: PublicSiteArticle
  }
  helpCenter: {
    categories: PublicSiteHelpCategory[]
  }
}
