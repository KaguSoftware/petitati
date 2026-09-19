import type * as React from "react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { cn } from "@/lib/utils";

/** Inputs whose content is always Latin (emails, passwords, phone digits, codes) stay LTR under RTL locales. */
export type LatinKind = "email" | "password" | "tel" | "postal" | "code";

export function latinInputProps(kind: LatinKind): Partial<React.ComponentProps<"input">> {
  const common: Partial<React.ComponentProps<"input">> = {
    dir: "ltr",
    autoCorrect: "off",
    spellCheck: false,
  };
  switch (kind) {
    case "email":
      return { ...common, type: "email", inputMode: "email", autoCapitalize: "none" };
    case "password":
      return { ...common, type: "password", autoCapitalize: "none" };
    case "tel":
      return { ...common, type: "tel", inputMode: "tel", autoCapitalize: "none" };
    case "postal":
      return { ...common, inputMode: "text", autoCapitalize: "characters" };
    case "code":
      return { ...common, autoCapitalize: "characters" };
  }
}

export function LatinInput({ kind, className, ...props }: React.ComponentProps<typeof Input> & { kind: LatinKind }) {
  // Every password field gets the show/hide eye and the Caps Lock hint.
  if (kind === "password") return <PasswordInput className={className} {...props} />;
  return (
    <Input
      {...latinInputProps(kind)}
      className={cn("text-start", kind === "code" && "uppercase tracking-wide", className)}
      {...props}
    />
  );
}
