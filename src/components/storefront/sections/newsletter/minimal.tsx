import type { NewsletterProps } from "../types";

/** A brand-coloured band with centred copy and the form. */
export function NewsletterMinimal({ title, subtitle, formSlot }: NewsletterProps) {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-gutter py-14 text-center @desktop:py-20">
        <h2 className="bidi-auto text-2xl font-semibold tracking-tight text-balance @tablet:text-3xl">{title}</h2>
        <p className="bidi-auto max-w-md text-primary-foreground/85">{subtitle}</p>
        <div className="mt-3 w-full max-w-md [&_input]:border-transparent [&_input]:bg-card [&_input]:text-foreground [&_input]:shadow-sm [&_button]:bg-card [&_button]:text-primary [&_button]:shadow-sm [&_button:hover]:bg-card/90">{formSlot}</div>
      </div>
    </section>
  );
}
