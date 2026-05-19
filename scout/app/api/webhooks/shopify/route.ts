import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS for webhook writes (server-side only, never exposed)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify the request genuinely came from Shopify using HMAC-SHA256
async function verifyShopifyWebhook(req: NextRequest, body: string): Promise<boolean> {
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!hmac || !secret) return false;

  const computed = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(computed));
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Security: reject any request that fails Shopify's HMAC signature check
  const valid = await verifyShopifyWebhook(req, body);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic");
  const shopDomain = req.headers.get("x-shopify-shop-domain");

  // Find which org this Shopify shop belongs to
  const { data: token } = await supabase
    .from("integration_tokens")
    .select("org_id")
    .eq("platform", "shopify")
    .eq("shop_domain", shopDomain)
    .maybeSingle();

  if (!token) {
    // Unknown shop — log and 200 (Shopify retries on non-200, don't spam)
    console.warn("Shopify webhook from unregistered shop:", shopDomain);
    return NextResponse.json({ ok: true });
  }

  const orgId = token.org_id;
  // Parse the raw payload — but we only extract specific numeric fields.
  // Raw content is stored in raw_payload but NEVER passed to Claude as instructions.
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (topic === "orders/paid" || topic === "orders/create") {
    await handleOrderPaid(orgId, payload);
  } else if (topic === "orders/cancelled" || topic === "refunds/create") {
    await handleRefund(orgId, payload);
  }

  // Always update the 30-day revenue snapshot after an order event
  if (topic?.startsWith("orders/") || topic?.startsWith("refunds/")) {
    await refreshRevenueSnapshot(orgId, shopDomain!);
  }

  return NextResponse.json({ ok: true });
}

async function handleOrderPaid(orgId: string, payload: Record<string, unknown>) {
  const orderId = String(payload.id ?? "");
  const totalPrice = parseFloat(String(payload.total_price ?? "0"));
  const currency = String(payload.currency ?? "GBP");
  const status = String(payload.financial_status ?? "paid");
  const createdAt = String(payload.created_at ?? new Date().toISOString());

  // Extract only product IDs (numeric identifiers, not content)
  const lineItems = (payload.line_items as Array<Record<string, unknown>>) ?? [];
  const productIds = lineItems.map((li) => String(li.product_id ?? "")).filter(Boolean);

  await supabase.from("shopify_orders").upsert({
    org_id: orgId,
    shopify_id: orderId,
    total_price: totalPrice,
    currency,
    financial_status: status,
    product_ids: productIds,
    created_at: createdAt,
  });

  // Snapshot the individual order as a metric
  await supabase.from("platform_snapshots").insert({
    org_id: orgId,
    platform: "shopify",
    metric: "order_revenue",
    value: totalPrice,
    trust_tier: 1,
    source_ref: orderId,
    raw_payload: payload,           // stored verbatim, never read as instructions
    snapped_at: createdAt,
  });
}

async function handleRefund(orgId: string, payload: Record<string, unknown>) {
  const orderId = String(payload.order_id ?? payload.id ?? "");
  const refundAmount = parseFloat(
    String((payload.transactions as Array<Record<string, unknown>>)?.[0]?.amount ?? "0")
  );

  if (refundAmount > 0) {
    await supabase.from("platform_snapshots").insert({
      org_id: orgId,
      platform: "shopify",
      metric: "refund",
      value: -refundAmount,
      trust_tier: 1,
      source_ref: orderId,
      raw_payload: payload,
    });
  }
}

// Recompute rolling 30-day revenue from our own order table (not from Shopify content)
async function refreshRevenueSnapshot(orgId: string, _shopDomain: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: orders } = await supabase
    .from("shopify_orders")
    .select("total_price, financial_status")
    .eq("org_id", orgId)
    .gte("created_at", since.toISOString());

  const revenue30d = (orders ?? [])
    .filter((o) => o.financial_status === "paid")
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const orders30d = (orders ?? []).filter((o) => o.financial_status === "paid").length;

  await supabase.from("platform_latest").upsert({
    org_id: orgId,
    platform: "shopify",
    revenue_30d: revenue30d,
    orders_30d: orders30d,
    updated_at: new Date().toISOString(),
  });
}
