"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a show/hide eye (catch typos without retyping) and a "Caps Lock is on" hint
 * while the key is on. LTR under RTL locales like every Latin-only input. Strings live in `common`
 * so the admin can use it too.
 */
export function PasswordInput({ className, onKeyDown, onKeyUp, onBlur, ...props }: React.ComponentProps<typeof Input>) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const hintId = useId();
  const readCaps = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  const describedBy = [props["aria-describedby"], caps ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative" dir="ltr">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          dir="ltr"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={describedBy}
          onKeyDown={(e) => {
            readCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            readCaps(e);
            onKeyUp?.(e);
          }}
          onBlur={(e) => {
            setCaps(false);
            onBlur?.(e);
          }}
          className={cn("text-start pe-12", className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-md text-muted-foreground transition-colors hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>
      {caps && (
        <p id={hintId} role="status" className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {t("capsLockOn")}
        </p>
      )}
    </div>
  );
}
