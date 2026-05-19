import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncShopifyFull } from "@/app/api/connect/shopify/validate/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code   = searchParams.get("code");
  const orgId  = searchParams.get("state");
  const error  = searchParams.get("error");
  const shop   = process.env.SHOPIFY_STORE_DOMAIN!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code || !orgId) {
    return NextResponse.redirect(`${appUrl}/app/integrations?shopify=denied`);
  }

  // Exchange the code for a permanent access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.SHOPIFY_CLIENT_ID!,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/app/integrations?shopify=error`);
  }

  const { access_token, scope } = await tokenRes.json();

  // Store the token securely (service role — never exposed to browser)
  await supabase.from("integration_tokens").upsert({
    org_id:       orgId,
    platform:     "shopify",
    shop_domain:  shop,
    access_token,
    scopes:       scope?.split(",") ?? [],
    connected_at: new Date().toISOString(),
  });

  // Register webhooks now that we have the token
  const webhookUrl = `${appUrl}/api/webhooks/shopify`;
  const topics = [
    "orders/paid", "orders/cancelled", "orders/updated",
    "refunds/create", "products/create", "products/update",
    "customers/create", "inventory_levels/update",
  ];
  await Promise.allSettled(topics.map(topic =>
    fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ webhook: { topic, address: webhookUrl, format: "json" } }),
    })
  ));

  // Pull full historical data immediately in the background
  syncShopifyFull(shop, access_token, orgId).catch(console.error);

  return NextResponse.redirect(`${appUrl}/app/integrations?shopify=connected`);
}
