"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ClearInputButton } from "@/components/shared/clear-input-button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function SearchForm({
  placeholder,
  className,
  onSubmitted,
}: {
  placeholder: string;
  className?: string;
  /** Called after navigation starts (lets a drawer close itself). */
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  // Uncontrolled input (the URL owns the query); this only decides whether the × shows.
  const [hasValue, setHasValue] = useState(!!params.get("q"));
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
        router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
        onSubmitted?.();
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        name="q"
        type="search"
        onInput={(e) => setHasValue(e.currentTarget.value !== "")}
        dir="auto"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        defaultValue={params.get("q") ?? ""}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-9 rounded-full border-transparent bg-muted/60 ps-8 pe-3 focus-visible:bg-card [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          hasValue && "pe-9",
        )}
      />
      {hasValue && (
        <ClearInputButton
          onClear={() => {
            if (inputRef.current) inputRef.current.value = "";
            setHasValue(false);
            inputRef.current?.focus();
          }}
        />
      )}
    </form>
  );
}
