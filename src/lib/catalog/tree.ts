import type { CategoryData } from "./types";

type Node = Pick<CategoryData, "id" | "slug" | "parentId">;

/** Root → … → the category with `slug`; empty when the slug is unknown. Pure, safe on the client. */
export function categoryChain<T extends Node>(categories: T[], slug: string): T[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chain: T[] = [];
  let cur = categories.find((c) => c.slug === slug);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

/** Direct children of a category, in the list's (sort_order) order. */
export function childrenOf<T extends Node>(categories: T[], id: string): T[] {
  return categories.filter((c) => c.parentId === id);
}
