import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * A missing order, product or customer (or a mistyped admin URL) stays inside the admin shell and
 * leads back to the dashboard, instead of dropping staff onto the shop's bare 404.
 */
export default function AdminNotFound() {
  const t = useTranslations("admin.common");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-6" />
      </span>
      <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("notFoundBody")}</p>
      <Link href="/admin" className={buttonVariants()}>
        {t("backToDashboard")}
      </Link>
    </div>
  );
}
