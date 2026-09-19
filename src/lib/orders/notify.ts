import "server-only";

import { after } from "next/server";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderRow, OrderStatus } from "@/lib/db/types";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { OrderStatusEmail } from "@/emails/order-status";

type Db = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Status mail for the shopper. Lives outside the `"use server"` modules because both the admin
 * actions and the public delivery confirm need it, and a `"use server"` file may only export
 * async server actions. `sendEmail` never throws, so callers do not have to guard it.
 *
 * The whole body runs in `after`, so neither the `stores` lookup nor the Resend round trip is on
 * the response path. That matters most in the bulk loops (`admin/orders/actions.ts`,
 * `admin/delivery/actions.ts`), where this used to be two sequential network hops per order.
 * Callers still `await` it; the await is now free.
 */
export async function notifyCustomer(
  db: Db,
  order: OrderRow,
  status: OrderStatus,
  extra: { trackingNumber?: string | null; trackingUrl?: string | null } = {},
) {
  after(async () => {
    const { data: store } = await db
      .from("stores")
      .select("slug, name, email_from")
      .eq("id", order.store_id)
      .maybeSingle<{ slug: string; name: string; email_from: string | null }>();
    if (!store) return;
    await sendEmail({
      to: order.email,
      from: store.email_from,
      subject: `${store.name} · ${order.number}`,
      react: OrderStatusEmail({
        storeName: store.name,
        orderNumber: order.number,
        orderUrl: `${env.appUrl()}/${order.locale}/order/${order.id}`,
        locale: order.locale,
        status,
        deliveryCode: status === "shipped" ? order.delivery_code : null,
        trackingNumber: extra.trackingNumber ?? order.tracking_number,
        trackingUrl: extra.trackingUrl ?? order.tracking_url,
      }),
    });
  });
}
