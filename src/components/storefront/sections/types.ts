import type { ReactNode } from "react";
import type { CategoryData, ProductCardData, ProductDetail, ReviewData } from "@/lib/catalog/types";
import type { CartSummary } from "@/lib/cart/cart";
import type { Totals } from "@/lib/checkout/totals";
import type { PaymentMethod, SocialKey, TrustIcon } from "@/lib/theme/footer";
import type { VariantKey } from "@/lib/theme/types";

/**
 * Props contract for every storefront section. All four variants of a section receive exactly
 * these props, so the admin can swap variants freely. Interactive bits (cart button, add-to-cart
 * panel, forms) arrive as ready-made ReactNode slots; variants only decide layout and styling.
 */

export interface AnnouncementBarProps {
  text: string;
}

export interface NavbarProps {
  storeName: string;
  logoUrl: string | null;
  /** the whole active tree; variants show top-level links on desktop and nest children in the drawer */
  categories: Pick<CategoryData, "id" | "slug" | "name" | "parentId">[];
  labels: { home: string; shop: string; brands: string; search: string; menu: string; closeMenu: string; categories: string; call: string };
  /** shown by layouts that have room for it (stacked bar at wide) */
  contactPhone: string | null;
  /** dynamic slots rendered by the page inside Suspense */
  cartSlot: ReactNode;
  accountSlot: ReactNode;
  localeSlot: ReactNode;
}

export interface HeroSlideProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
}

export interface HeroProps {
  /** At least one slide; two or more make every hero layout a carousel. */
  slides: HeroSlideProps[];
  /** `slideOf` is a template with `{n}` and `{total}` placeholders. */
  labels: { previous: string; next: string; slideOf: string; secondary?: string };
  /** Auto-advance (default true); previews pass false. */
  autoplay?: boolean;
}

export interface CategoryBannerProps {
  title: string;
  categories: CategoryData[];
}

export interface ProductGridProps {
  title?: string;
  products: ProductCardData[];
  currency: string;
  locale: string;
  cardVariant: VariantKey;
  /** Empty-state copy; an empty string hides the section entirely. */
  emptyLabel: string;
  /** Optional call to action under the empty-state copy (e.g. "Clear filters"). */
  emptyAction?: ReactNode;
  /** Render only the grid (no section container, title or "view all"): for pages that own their container. */
  bare?: boolean;
  /** product id → wishlist toggle node (only when signed in) */
  wishlistSlots?: Record<string, ReactNode>;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export interface ProductCardProps {
  product: ProductCardData;
  currency: string;
  locale: string;
  labels: { new: string; outOfStock: string; from?: string };
  wishlistSlot?: ReactNode;
}

export interface ProductPageProps {
  product: ProductDetail;
  currency: string;
  locale: string;
  labels: {
    description: string;
    sku: string;
    reviews: string;
    inStock: string;
    outOfStock: string;
    previousImage: string;
    nextImage: string;
    /** template with `{n}` and `{total}` placeholders */
    imageOf: string;
  };
  purchasePanel: ReactNode;
  reviewsSection: ReactNode;
  wishlistSlot?: ReactNode;
}

export interface CartViewProps {
  cart: CartSummary;
  totals: Totals;
  currency: string;
  locale: string;
  labels: {
    title: string;
    empty: string;
    emptyTitle: string;
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
    checkout: string;
    continueShopping: string;
    freeShipping: string;
    /** hint under the shipping row, e.g. "Free shipping on orders over X" */
    shippingNote: string | null;
  };
  /** cart line id → quantity controls node */
  lineControls: Record<string, ReactNode>;
  couponSlot: ReactNode;
  checkoutHref: string;
  shopHref: string;
}

export interface CheckoutLayoutProps {
  title: string;
  form: ReactNode;
  summary: ReactNode;
}

export interface ReviewsProps {
  reviews: ReviewData[];
  ratingAvg: number;
  ratingCount: number;
  locale: string;
  labels: { title: string; empty: string; emptyTitle: string; verified: string };
  formSlot: ReactNode | null;
}

export interface NewsletterProps {
  title: string;
  subtitle: string;
  formSlot: ReactNode;
}

export interface FooterLink {
  href: string;
  label: string;
}

export interface FooterProps {
  storeName: string;
  logoUrl: string | null;
  tagline: string | null;
  /** Shop, Brands, then the top-level categories (capped). */
  shopLinks: FooterLink[];
  /** About, My account, Privacy, Terms. */
  infoLinks: FooterLink[];
  contact: { email: string | null; phone: string | null; address: string | null; hours: string | null };
  social: { key: SocialKey; href: string; label: string }[];
  /** null = the trust strip is switched off; otherwise up to four resolved items. */
  trustItems: { icon: TrustIcon; title: string; text: string }[] | null;
  payments: { id: PaymentMethod; label: string }[];
  labels: { shop: string; info: string; contact: string; followUs: string; address: string; hours: string; weAccept: string; rights: string };
  localeSlot: ReactNode;
  year: number;
}

export interface SectionProps {
  announcementBar: AnnouncementBarProps;
  navbar: NavbarProps;
  hero: HeroProps;
  categoryBanner: CategoryBannerProps;
  productGrid: ProductGridProps;
  productCard: ProductCardProps;
  productPage: ProductPageProps;
  cartDrawer: CartViewProps;
  checkout: CheckoutLayoutProps;
  reviews: ReviewsProps;
  newsletter: NewsletterProps;
  footer: FooterProps;
}
