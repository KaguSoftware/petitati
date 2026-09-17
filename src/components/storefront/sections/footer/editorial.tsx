import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { PaymentBadges } from "@/components/storefront/shared/payment-badges";
import { SocialLinks } from "@/components/storefront/shared/social-links";
import { TrustStrip } from "@/components/storefront/shared/trust-strip";
import type { FooterProps } from "../types";

const link = "text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground";
const Dot = () => (
  <span aria-hidden className="text-foreground/30">
    ·
  </span>
);

/** Centred masthead: serif wordmark, one dot-separated line of links, a contact line and the hours between hairlines. */
export function FooterEditorial({ storeName, tagline, shopLinks, infoLinks, contact, social, trustItems, payments, labels, localeSlot, year }: FooterProps) {
  const items = [...shopLinks, ...infoLinks];
  const contactBits = [contact.address?.split(/\r?\n/).join(" · "), contact.phone, contact.email].filter((x): x is string => !!x);
  return (
    <footer className="border-t border-foreground/15 bg-background">
      <TrustStrip items={trustItems} tone="hairline" />
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-gutter py-14 text-center @tablet:py-20">
        <div className="flex flex-col items-center gap-3">
          <p className="font-heading text-4xl font-medium tracking-tight @tablet:text-5xl">{storeName}</p>
          {tagline && <p className="bidi-auto max-w-md font-heading text-base italic text-muted-foreground">{tagline}</p>}
        </div>
        <nav aria-label={labels.shop} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {items.map((item, i) => (
            <Fragment key={item.href}>
              {i > 0 && <Dot />}
              <Link href={item.href} className={link}>
                {item.label}
              </Link>
            </Fragment>
          ))}
        </nav>
        {(contactBits.length > 0 || contact.hours) && (
          <div className="flex w-full flex-col items-center gap-2 border-y border-foreground/15 px-6 py-4 text-sm text-muted-foreground">
            {contactBits.length > 0 && (
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span className="text-xs uppercase tracking-[0.18em]">{labels.contact}</span>
                {contactBits.map((bit, i) => (
                  <Fragment key={i}>
                    <Dot />
                    {bit === contact.phone ? (
                      <a href={`tel:${bit.replace(/\s/g, "")}`} className="hover:text-foreground">
                        <bdi dir="ltr">{bit}</bdi>
                      </a>
                    ) : bit === contact.email ? (
                      <a href={`mailto:${bit}`} className="hover:text-foreground">
                        <bdi dir="ltr">{bit}</bdi>
                      </a>
                    ) : (
                      <span className="bidi-auto">{bit}</span>
                    )}
                  </Fragment>
                ))}
              </p>
            )}
            {contact.hours && (
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span className="text-xs uppercase tracking-[0.18em]">{labels.hours}</span>
                <Dot />
                <span className="bidi-auto font-heading italic">{contact.hours.split(/\r?\n/).join(" · ")}</span>
              </p>
            )}
          </div>
        )}
        <SocialLinks links={social} variant="text" className="justify-center" />
        <div className="flex flex-col items-center gap-4 text-micro uppercase tracking-[0.15em] text-muted-foreground">
          <PaymentBadges methods={payments} className="justify-center" />
          {localeSlot}
          <span>
            <bdi dir="ltr">© {year} {storeName}.</bdi> {labels.rights}
          </span>
        </div>
      </div>
    </footer>
  );
}
