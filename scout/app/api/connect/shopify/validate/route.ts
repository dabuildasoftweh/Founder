import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API = "2024-01";

function shopifyFetch(domain: string, token: string, path: string) {
  return fetch(`https://${domain}/admin/api/${API}${path}`, {
    headers: { "X-Shopify-Access-Token": token },
  });
}

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated user
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain, token, orgId } = await req.json();
  if (!domain || !token || !orgId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify the token works
  const testRes = await shopifyFetch(domain, token, "/shop.json");
  if (!testRes.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const { shop } = await testRes.json();

  await supabase.from("integration_tokens").upsert({
    org_id: orgId,
    platform: "shopify",
    shop_domain: domain,
    access_token: token,
    connected_at: new Date().toISOString(),
    scopes: [
      "read_orders", "read_all_orders", "read_fulfillments", "read_transactions",
      "read_products", "read_inventory", "read_price_rules", "read_discounts",
      "read_customers", "read_reports", "read_analytics",
      "read_shopify_payments_payouts", "read_locations",
    ],
  });

  // Register webhooks for real-time events
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify`;
  const topics = [
    "orders/paid", "orders/cancelled", "orders/updated", "orders/fulfilled",
    "refunds/create",
    "products/create", "products/update", "products/delete",
    "customers/create", "customers/update",
    "inventory_levels/update",
  ];
  await Promise.allSettled(topics.map(topic =>
    shopifyFetch(domain, token, "/webhooks.json").then(() =>
      fetch(`https://${domain}/admin/api/${API}/webhooks.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ webhook: { topic, address: webhookUrl, format: "json" } }),
      })
    )
  ));

  // Full historical sync — run in background, respond immediately
  syncShopifyFull(domain, token, orgId, shop).catch(console.error);

  return NextResponse.json({ ok: true, shop: shop.name });
}

export async function syncShopifyFull(
  domain: string,
  token: string,
  orgId: string,
  shop?: Record<string, unknown>
) {
  const since12m = new Date(Date.now() - 365 * 86400000).toISOString();
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const since7d  = new Date(Date.now() - 7  * 86400000).toISOString();

  // ── 1. All orders (last 12 months) ──────────────────────────────────────
  let allOrders: Array<Record<string, unknown>> = [];
  let nextUrl: string | null = `https://${domain}/admin/api/${API}/orders.json?status=any&created_at_min=${since12m}&limit=250`;
  while (nextUrl) {
    const pageRes: Response = await fetch(nextUrl, { headers: { "X-Shopify-Access-Token": token } });
    if (!pageRes.ok) break;
    const data = await pageRes.json();
    allOrders = allOrders.concat(data.orders ?? []);
    const linkHeader: string = pageRes.headers.get("link") ?? "";
    nextUrl = linkHeader.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }

  const orderRows = allOrders.map((o) => ({
    org_id: orgId,
    shopify_id: String(o.id),
    total_price: parseFloat(String(o.total_price ?? "0")),
    currency: String(o.currency ?? shop?.currency ?? "GBP"),
    financial_status: String(o.financial_status ?? ""),
    product_ids: ((o.line_items as Array<Record<string, unknown>>) ?? []).map((li) => String(li.product_id)),
    created_at: String(o.created_at),
  }));

  if (orderRows.length > 0) {
    // Upsert in batches of 100
    for (let i = 0; i < orderRows.length; i += 100) {
      await supabase.from("shopify_orders").upsert(orderRows.slice(i, i + 100), { onConflict: "shopify_id" });
    }
  }

  // ── 2. Revenue & order analytics by window ───────────────────────────────
  const paidOrders = allOrders.filter(o => o.financial_status === "paid" || o.financial_status === "partially_refunded");
  const refunds    = allOrders.filter(o => o.financial_status === "refunded");

  const revenue = (cutoff: string) =>
    paidOrders.filter(o => String(o.created_at) >= cutoff).reduce((s, o) => s + parseFloat(String(o.total_price ?? 0)), 0);
  const orderCount = (cutoff: string) =>
    paidOrders.filter(o => String(o.created_at) >= cutoff).length;

  const rev7d  = revenue(since7d);
  const rev30d = revenue(since30d);
  const rev12m = revenue(since12m);
  const ord7d  = orderCount(since7d);
  const ord30d = orderCount(since30d);
  const aov30d = ord30d > 0 ? rev30d / ord30d : 0;
  const refundRate = allOrders.length > 0 ? (refunds.length / allOrders.length) * 100 : 0;

  // ── 3. Top products by revenue (last 30 days) ────────────────────────────
  const productRevenue: Record<string, { title: string; revenue: number; units: number }> = {};
  for (const order of paidOrders.filter(o => String(o.created_at) >= since30d)) {
    for (const li of (order.line_items as Array<Record<string, unknown>>) ?? []) {
      const pid = String(li.product_id);
      if (!productRevenue[pid]) productRevenue[pid] = { title: String(li.title ?? ""), revenue: 0, units: 0 };
      productRevenue[pid].revenue += parseFloat(String(li.price ?? 0)) * parseInt(String(li.quantity ?? 1), 10);
      productRevenue[pid].units   += parseInt(String(li.quantity ?? 1), 10);
    }
  }
  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([id, v]) => ({ id, ...v }));

  // ── 4. Customer analytics ─────────────────────────────────────────────────
  const custRes = await shopifyFetch(domain, token, "/customers/count.json");
  const totalCustomers = custRes.ok ? (await custRes.json()).count ?? 0 : 0;

  const newCust30d = new Set(
    allOrders.filter(o => String(o.created_at) >= since30d).map(o => String((o.customer as Record<string, unknown>)?.id))
  ).size;

  // Returning vs new: customers who have more than 1 order
  const ordersByCustomer: Record<string, number> = {};
  for (const o of paidOrders) {
    const cid = String((o.customer as Record<string, unknown>)?.id ?? "guest");
    ordersByCustomer[cid] = (ordersByCustomer[cid] ?? 0) + 1;
  }
  const returningCustomers = Object.values(ordersByCustomer).filter(n => n > 1).length;

  // ── 5. Inventory snapshot ─────────────────────────────────────────────────
  const invRes = await shopifyFetch(domain, token, "/inventory_levels.json?limit=250");
  let totalInventoryValue = 0;
  let lowStockCount = 0;
  if (invRes.ok) {
    const { inventory_levels } = await invRes.json();
    for (const il of inventory_levels ?? []) {
      if ((il.available ?? 0) < 5) lowStockCount++;
      totalInventoryValue += Math.max(0, il.available ?? 0);
    }
  }

  // ── 6. Payouts (Shopify Payments) ────────────────────────────────────────
  let totalPaidOut30d = 0;
  const payoutRes = await shopifyFetch(domain, token, `/shopify_payments/payouts.json?date_min=${since30d.split("T")[0]}`);
  if (payoutRes.ok) {
    const { payouts } = await payoutRes.json();
    totalPaidOut30d = (payouts ?? [])
      .filter((p: Record<string, unknown>) => p.status === "paid")
      .reduce((s: number, p: Record<string, unknown>) => s + parseFloat(String(p.amount ?? 0)), 0);
  }

  // ── 7. Write to platform_latest ──────────────────────────────────────────
  await supabase.from("platform_latest").upsert({
    org_id: orgId,
    platform: "shopify",
    revenue_7d:    rev7d,
    revenue_30d:   rev30d,
    orders_30d:    ord30d,
    top_content:   topProducts,   // reusing jsonb column for top products
    updated_at:    new Date().toISOString(),
    // Extended analytics stored in a jsonb extras column
    extras: {
      revenue_12m:        rev12m,
      orders_7d:          ord7d,
      aov_30d:            Math.round(aov30d * 100) / 100,
      refund_rate_pct:    Math.round(refundRate * 10) / 10,
      total_customers:    totalCustomers,
      new_customers_30d:  newCust30d,
      returning_customers: returningCustomers,
      low_stock_count:    lowStockCount,
      total_inventory_units: totalInventoryValue,
      payout_30d:         totalPaidOut30d,
      shop_name:          shop?.name,
      shop_currency:      shop?.currency,
    },
  });

  // Snapshot each metric individually for time-series charts
  const now = new Date().toISOString();
  await supabase.from("platform_snapshots").insert([
    { org_id: orgId, platform: "shopify", metric: "revenue_7d",   value: rev7d,   trust_tier: 1, snapped_at: now },
    { org_id: orgId, platform: "shopify", metric: "revenue_30d",  value: rev30d,  trust_tier: 1, snapped_at: now },
    { org_id: orgId, platform: "shopify", metric: "aov_30d",      value: aov30d,  trust_tier: 1, snapped_at: now },
    { org_id: orgId, platform: "shopify", metric: "refund_rate",  value: refundRate, trust_tier: 1, snapped_at: now },
    { org_id: orgId, platform: "shopify", metric: "new_customers_30d", value: newCust30d, trust_tier: 1, snapped_at: now },
  ]);

  await supabase.from("integration_tokens")
    .update({ last_sync_at: now, sync_error: null })
    .eq("org_id", orgId).eq("platform", "shopify");
}
