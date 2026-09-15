import Image from "next/image";
import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
}: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-card text-primary/25", className)}>
        <PawPrint aria-hidden className="size-[28%] max-h-16 max-w-16" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-card", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
