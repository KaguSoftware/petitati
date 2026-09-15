import type { CategoryData } from "@/lib/catalog/types";

export interface NavItem {
  href: string;
  label: string;
  /** category photo; the desktop mega-menu shows it on top-level items */
  imageUrl?: string | null;
  /** nested links (sub-categories): indented under the parent in the drawer, listed under it in the mega-menu */
  children?: NavItem[];
}

/**
 * Turn the flat, ordered category list into drawer links: top-level categories with their direct
 * children nested (the tree is one level deep in practice; deeper levels are flattened under the
 * nearest top-level ancestor's child).
 */
export function categoryNavItems(categories: Pick<CategoryData, "id" | "slug" | "name" | "parentId" | "imageUrl">[]): NavItem[] {
  const byParent = new Map<string, NavItem[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = byParent.get(c.parentId) ?? [];
    list.push({ href: `/c/${c.slug}`, label: c.name });
    byParent.set(c.parentId, list);
  }
  return categories
    .filter((c) => !c.parentId)
    .map((c) => {
      const children = byParent.get(c.id);
      const item: NavItem = { href: `/c/${c.slug}`, label: c.name, imageUrl: c.imageUrl };
      return children?.length ? { ...item, children } : item;
    });
}
