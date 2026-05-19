import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { domain, token, orgId } = await req.json();
  if (!domain || !token || !orgId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify the token works by hitting Shopify's shop endpoint
  const testRes = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });

  if (!testRes.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Store the token (service role — server only, never client-exposed)
  await supabase.from("integration_tokens").upsert({
    org_id: orgId,
    platform: "shopify",
    shop_domain: domain,
    access_token: token,
    connected_at: new Date().toISOString(),
    scopes: ["read_orders", "read_products"],
  });

  // Register webhooks so Shopify pushes to us on every order
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify`;
  const topics = ["orders/paid", "orders/cancelled", "refunds/create"];

  await Promise.allSettled(topics.map(topic =>
    fetch(`https://${domain}/admin/api/2024-01/webhooks.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ webhook: { topic, address: webhookUrl, format: "json" } }),
    })
  ));

  // Pull historical orders for the last 90 days immediately
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const ordersRes = await fetch(
    `https://${domain}/admin/api/2024-01/orders.json?status=paid&created_at_min=${since.toISOString()}&limit=250`,
    { headers: { "X-Shopify-Access-Token": token } }
  );

  if (ordersRes.ok) {
    const { orders } = await ordersRes.json();
    const rows = (orders as Array<Record<string, unknown>>).map((o) => ({
      org_id: orgId,
      shopify_id: String(o.id),
      total_price: parseFloat(String(o.total_price ?? "0")),
      currency: String(o.currency ?? "GBP"),
      financial_status: String(o.financial_status ?? "paid"),
      product_ids: ((o.line_items as Array<Record<string, unknown>>) ?? []).map((li) => String(li.product_id)),
      created_at: String(o.created_at),
    }));

    if (rows.length > 0) {
      await supabase.from("shopify_orders").upsert(rows, { onConflict: "shopify_id" });
    }

    // Compute and store 30-day rolling totals
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const recent = rows.filter(r => new Date(r.created_at) > cutoff);
    const revenue30d = recent.reduce((s, r) => s + r.total_price, 0);

    await supabase.from("platform_latest").upsert({
      org_id: orgId,
      platform: "shopify",
      revenue_30d: revenue30d,
      orders_30d: recent.length,
      updated_at: new Date().toISOString(),
    });

    await supabase.from("integration_tokens")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("org_id", orgId).eq("platform", "shopify");
  }

  return NextResponse.json({ ok: true });
}
