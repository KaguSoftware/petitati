"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { IntlProvider, type AbstractIntlMessages } from "use-intl";

/**
 * Pure client-side intl context. We deliberately avoid next-intl's server `NextIntlClientProvider`
 * because it awaits request-scoped config, which would make the whole root layout dynamic under
 * Cache Components. Server components keep using `getTranslations` from next-intl/server.
 *
 * `DirectionProvider` tells Base UI (Select, Combobox, Slider, popups…) which way is "start" so
 * keyboard navigation and inline-start/end positioning mirror correctly under `fa`.
 *
 * The root gets only the namespaces the error boundaries need; each route group re-provides its own
 * set with `MessagesProvider`. See src/i18n/namespaces.ts for why.
 */
export function AppIntlProvider({
  locale,
  dir,
  messages,
  children,
}: {
  locale: string;
  dir: "ltr" | "rtl";
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <IntlProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
      <DirectionProvider direction={dir}>{children}</DirectionProvider>
    </IntlProvider>
  );
}

/**
 * Swaps the message set for one subtree. Direction is inherited from `AppIntlProvider` above, so
 * this deliberately does NOT re-declare `DirectionProvider`.
 *
 * A nested `IntlProvider` REPLACES its parent's messages rather than merging them, so whatever is
 * passed here must cover the whole subtree.
 */
export function MessagesProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <IntlProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
      {children}
    </IntlProvider>
  );
}
