"use client";

import { CollapseAllButton } from "../shared/collapsible-card";

/** The Design page's foldable cards, top to bottom; one group so "collapse all" reaches every one. */
export const DESIGN_GROUP = "admin-design";
const DESIGN_SECTIONS = ["branding", "hero", "colors", "shape", "announcement", "sections"];

export function DesignCollapseAll({ labels }: { labels: { expand: string; collapse: string } }) {
  return <CollapseAllButton group={DESIGN_GROUP} ids={DESIGN_SECTIONS} labels={labels} />;
}
