import type { NewsletterProps } from "../types";

/** Split by a rule: serif headline on the start side, the form on the end side. */
export function NewsletterEditorial({ title, subtitle, formSlot }: NewsletterProps) {
  return (
    <section className="border-y border-foreground/15 bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-gutter py-14 @tablet:grid-cols-2 @tablet:gap-0 @tablet:py-20">
        <div className="flex flex-col gap-3 @tablet:border-e @tablet:border-foreground/15 @tablet:pe-12">
          <span aria-hidden className="text-xs tracking-[0.2em] text-muted-foreground">
            03
          </span>
          <h2 className="font-heading text-3xl font-medium tracking-tight text-balance @tablet:text-5xl">{title}</h2>
        </div>
        <div className="flex flex-col justify-center gap-5 @tablet:ps-12 @desktop:justify-self-end">
          <p className="max-w-md font-heading text-lg italic text-muted-foreground">{subtitle}</p>
          <div className="w-full max-w-md">{formSlot}</div>
        </div>
      </div>
    </section>
  );
}
