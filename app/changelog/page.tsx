import { ChangelogPage } from "@/features/site/components/changelog-page"
import { loadPublicSiteChangelogEntries } from "@/server/modules/site-changelog/service"

export const dynamic = "force-dynamic"

export default async function PublicChangelogRoutePage() {
  const data = await loadPublicSiteChangelogEntries({ page: 1, limit: 50 })
  return <ChangelogPage entries={data.items} />
}
