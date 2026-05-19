-- ============================================================
-- Data Ingestion Layer Migration
-- Run in Supabase → SQL Editor
-- ============================================================

-- Platform metric snapshots (Tier 1 trust: first-party only)
CREATE TABLE IF NOT EXISTS platform_snapshots (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid REFERENCES organisations(id) ON DELETE CASCADE,
  platform     text NOT NULL CHECK (platform IN ('shopify','youtube','instagram','tiktok')),
  metric       text NOT NULL,
  -- e.g. 'revenue','orders','subscribers','views','watch_minutes','revenue_youtube'
  value        numeric NOT NULL,
  period_start timestamptz,  -- for time-windowed metrics (e.g. last 7 days)
  period_end   timestamptz,
  trust_tier   int NOT NULL DEFAULT 1 CHECK (trust_tier = 1), -- enforced: only Tier 1 allowed here
  source_ref   text,         -- e.g. Shopify order ID, YouTube video ID
  raw_payload  jsonb,        -- original API response, never interpreted as instructions
  snapped_at   timestamptz DEFAULT now()
);

-- One row per platform per org (latest values, fast reads)
CREATE TABLE IF NOT EXISTS platform_latest (
  org_id       uuid REFERENCES organisations(id) ON DELETE CASCADE,
  platform     text NOT NULL,
  subscribers  numeric,
  followers    numeric,
  views_7d     numeric,
  watch_min_7d numeric,
  revenue_7d   numeric,
  revenue_30d  numeric,
  orders_30d   numeric,
  top_content  jsonb,        -- [{title, views, url}] top 5 videos/posts
  extras       jsonb,        -- platform-specific extended analytics
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, platform)
);

-- If table already exists from a prior migration run, just add the extras column
ALTER TABLE platform_latest ADD COLUMN IF NOT EXISTS extras jsonb;

-- OAuth tokens for platform connections (never exposed to Claude directly)
CREATE TABLE IF NOT EXISTS integration_tokens (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid REFERENCES organisations(id) ON DELETE CASCADE,
  platform      text NOT NULL CHECK (platform IN ('shopify','youtube','instagram','tiktok')),
  shop_domain   text,                          -- Shopify only
  access_token  text NOT NULL,                 -- store encrypted in prod
  refresh_token text,
  expires_at    timestamptz,
  scopes        text[],
  connected_at  timestamptz DEFAULT now(),
  last_sync_at  timestamptz,
  sync_error    text,                          -- last error message if sync failed
  UNIQUE (org_id, platform)
);

-- Shopify orders (structured, not raw content)
CREATE TABLE IF NOT EXISTS shopify_orders (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid REFERENCES organisations(id) ON DELETE CASCADE,
  shopify_id      text UNIQUE NOT NULL,
  total_price     numeric NOT NULL,
  currency        text DEFAULT 'GBP',
  financial_status text,   -- 'paid','refunded','partially_refunded'
  product_ids     text[],
  created_at      timestamptz NOT NULL,
  ingested_at     timestamptz DEFAULT now()
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_snapshots_org_platform ON platform_snapshots(org_id, platform, snapped_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_org_date ON shopify_orders(org_id, created_at DESC);
