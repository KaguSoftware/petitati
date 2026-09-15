import type { Locale } from "@/i18n/config";
import type {
  CategoryRow,
  CategoryTranslationRow,
  ProductImageRow,
  ProductOptionRow,
  ProductOptionValueRow,
  ProductRow,
  ProductStatus,
  ProductTranslationRow,
  ProductVariantRow,
} from "@/lib/db/types";

export const PRODUCT_STATUSES: readonly ProductStatus[] = ["draft", "active", "archived"];

export type ProductSort = "updated_at" | "name";
export const PRODUCT_SORTS: readonly ProductSort[] = ["updated_at", "name"];

/** One row of the admin products table, already localised. */
export interface ProductListRow {
  id: string;
  slug: string;
  status: ProductStatus;
  is_featured: boolean;
  is_bestseller: boolean;
  updated_at: string;
  name: string;
  thumbnail: string | null;
  priceMin: number | null;
  priceMax: number | null;
  stockTotal: number;
  /** False when every variant skips inventory tracking (stock total is meaningless). */
  tracksStock: boolean;
  variantCount: number;
  brandName: string | null;
  categoryNames: string[];
}

export interface ProductListFilters {
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
}

export type OptionWithValues = ProductOptionRow & { values: ProductOptionValueRow[] };
export type VariantWithValues = ProductVariantRow & { optionValueIds: string[] };

/** Full editable graph of one product. */
export interface ProductEditData {
  product: ProductRow;
  translations: ProductTranslationRow[];
  options: OptionWithValues[];
  variants: VariantWithValues[];
  images: ProductImageRow[];
  categoryIds: string[];
}

/** Translation fields edited per locale in the product form. */
export interface ProductTranslationInput {
  name: string;
  short_description: string;
  description: string;
  seo_title: string;
  seo_description: string;
}
export type ProductTranslationsInput = Partial<Record<Locale, ProductTranslationInput>>;

export interface CategoryAdminRow extends CategoryRow {
  translations: CategoryTranslationRow[];
  /** Localised name (falls back to slug). */
  name: string;
  parentName: string | null;
  productCount: number;
}

/** Lightweight option list for selects/checkbox lists. */
export interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}
