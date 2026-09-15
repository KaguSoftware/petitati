import { User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { AccountMenu } from "./account-menu";

const trigger = buttonVariants({ variant: "ghost", size: "icon-lg", className: "rounded-full" });

/**
 * The navbar's account control: one menu holding the account links and the colour scheme. Reads
 * the session cookie, so it is dynamic — always render inside <Suspense>.
 *
 * This replaced a plain icon that linked to /account or /sign-in. Language lived in here for a
 * while too; since 2026-09-15 it is its own pill in the bar (the owner wants it visible), so the
 * menu no longer carries it. The cart deliberately stays separate.
 */
export async function AccountMenuSlot() {
  const user = await getSessionUser();
  return <AccountMenu user={user ? { name: user.profile.full_name, email: user.email ?? "" } : null} />;
}

/** Same footprint as the menu trigger, so the header never shifts while the session loads. */
export function AccountMenuFallback() {
  return (
    <span aria-hidden className={trigger}>
      <User className="size-5" />
    </span>
  );
}
