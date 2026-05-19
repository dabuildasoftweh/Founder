import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// GET /api/connect/shopify?org_id=xxx → redirects to Shopify OAuth
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  // Verify caller is authenticated
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const shop   = process.env.SHOPIFY_STORE_DOMAIN!;
  const scopes = [
    "read_orders", "read_all_orders", "read_fulfillments",
    "read_products", "read_inventory", "read_price_rules", "read_discounts",
    "read_customers", "read_customer_events", "read_reports", "read_analytics",
    "read_shopify_payments_payouts", "read_shopify_payments_accounts",
    "read_shopify_payments_disputes", "read_locations", "read_draft_orders",
    "read_returns", "read_marketing_events", "read_gift_cards", "read_shipping",
  ].join(",");

  const params = new URLSearchParams({
    client_id:    process.env.SHOPIFY_CLIENT_ID!,
    scope:        scopes,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/shopify/callback`,
    state:        orgId,  // passed back in callback to identify org
  });

  return NextResponse.redirect(
    `https://${shop}/admin/oauth/authorize?${params}`
  );
}
