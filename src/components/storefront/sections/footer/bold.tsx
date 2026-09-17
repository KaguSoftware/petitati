import { Link } from "@/i18n/navigation";
import { ContactBlock } from "@/components/storefront/shared/contact-block";
import { PaymentBadges } from "@/components/storefront/shared/payment-badges";
import { SocialLinks } from "@/components/storefront/shared/social-links";
import { TrustStrip } from "@/components/storefront/shared/trust-strip";
import type { FooterLink, FooterProps } from "../types";

const link = "text-xs font-bold tracking-widest whitespace-nowrap uppercase text-inverse-foreground/70 decoration-2 underline-offset-4 transition-colors hover:text-inverse-foreground hover:underline";

function Row({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <p className="text-micro font-bold tracking-widest text-inverse-foreground/50 uppercase">{title}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={link}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** A giant wordmark across a dark footer, then contact on one side and link rows on the other. */
export function FooterBold({ storeName, tagline, shopLinks, infoLinks, contact, social, trustItems, payments, labels, localeSlot, year }: FooterProps) {
  return (
    <footer className="overflow-hidden bg-inverse text-inverse-foreground">
      <TrustStrip items={trustItems} tone="dark" />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-gutter pt-14 pb-8 @tablet:pt-20">
        <p aria-hidden className="-mb-2 -ms-[0.05em] truncate font-heading text-[21cqw] leading-[0.8] font-extrabold tracking-tighter uppercase @tablet:text-[14cqw] @wide:text-[12rem]">
          {storeName}
        </p>
        {tagline && <p className="bidi-auto max-w-md text-sm font-medium text-inverse-foreground/70">{tagline}</p>}
        <div className="grid gap-10 border-t-2 border-inverse-foreground/20 pt-8 @tablet:grid-cols-[1.2fr_1fr] @tablet:gap-14">
          <div className="flex flex-col gap-5">
            <p className="text-micro font-bold tracking-widest text-inverse-foreground/50 uppercase">{labels.contact}</p>
            <ContactBlock contact={contact} labels={labels} tone="dark" phoneClassName="text-2xl font-extrabold tracking-tight text-inverse-foreground [&_svg]:mt-1.5 [&_svg]:size-5" />
            {social.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-micro font-bold tracking-widest text-inverse-foreground/50 uppercase">{labels.followUs}</p>
                <SocialLinks links={social} variant="square" tone="dark" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-8">
            <Row title={labels.shop} links={shopLinks} />
            <Row title={labels.info} links={infoLinks} />
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t-2 border-inverse-foreground/20 pt-6 pb-2 text-micro font-bold tracking-widest text-inverse-foreground/60 uppercase @tablet:flex-row @tablet:items-center @tablet:justify-between">
          <span>
            <bdi dir="ltr">© {year} {storeName}.</bdi> {labels.rights}
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <PaymentBadges methods={payments} tone="dark" />
            {localeSlot}
          </div>
        </div>
      </div>
    </footer>
  );
}
