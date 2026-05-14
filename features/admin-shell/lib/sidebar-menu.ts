import { ADMIN_ROUTES } from "@/constants/routes"

type AdminMenuItemLike = {
  href: string
  children?: AdminMenuItemLike[]
}

function matchesAdminMenuHref(item: AdminMenuItemLike, pathname: string) {
  if (item.href === ADMIN_ROUTES.home) {
    return pathname === ADMIN_ROUTES.home
  }

  if (item.children?.length) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  return pathname === item.href
}

function getBestAdminMenuMatch(items: AdminMenuItemLike[], pathname: string) {
  return items
    .filter((item) => matchesAdminMenuHref(item, pathname))
    .sort((first, second) => second.href.length - first.href.length)[0]
    ?? null
}

export function isAdminMenuItemActive(
  item: AdminMenuItemLike,
  pathname: string,
  siblingItems: AdminMenuItemLike[],
) {
  if (!matchesAdminMenuHref(item, pathname)) {
    return false
  }

  const bestMatch = getBestAdminMenuMatch(siblingItems, pathname)

  return bestMatch?.href === item.href
}

export function getNextExpandedAdminMenuHref(currentExpandedHref: string | null, clickedHref: string) {
  return currentExpandedHref === clickedHref ? null : clickedHref
}

export function getRenderedExpandedAdminMenuHref(
  manualExpandedHref: string | null | undefined,
  activeHref: string | null,
) {
  return manualExpandedHref === undefined ? activeHref : manualExpandedHref
}
