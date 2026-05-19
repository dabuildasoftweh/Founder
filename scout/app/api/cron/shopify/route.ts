import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncShopifyFull } from "@/app/api/connect/shopify/validate/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Runs daily via Vercel Cron — refreshes all Shopify analytics
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("org_id, shop_domain, access_token")
    .eq("platform", "shopify");

  if (!tokens?.length) return NextResponse.json({ ok: true, synced: 0 });

  const results = await Promise.allSettled(
    tokens.map(t => syncShopifyFull(t.shop_domain, t.access_token, t.org_id))
  );

  const succeeded = results.filter(r => r.status === "fulfilled").length;

  // Log any failures back to integration_tokens
  await Promise.allSettled(
    results.map(async (r, i) => {
      if (r.status === "rejected") {
        await supabase.from("integration_tokens")
          .update({ sync_error: String(r.reason) })
          .eq("org_id", tokens[i].org_id)
          .eq("platform", "shopify");
      }
    })
  );

  return NextResponse.json({ ok: true, synced: succeeded, total: tokens.length });
}
