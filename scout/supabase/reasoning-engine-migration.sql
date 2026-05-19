-- ============================================================
-- Reasoning Engine Migration
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Extend daily_logs with leverage tracking
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS leverage_type text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS hours numeric(4,1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS related_idea_id uuid REFERENCES ideas(id) ON DELETE SET NULL;

-- 2. Signals table
-- Logs external market feedback against specific ideas.
-- Signal-to-Noise = total_signal_strength / weighted_hours_per_idea
CREATE TABLE IF NOT EXISTS signals (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id         uuid REFERENCES ideas(id) ON DELETE SET NULL,
  description     text NOT NULL,
  strength        int  NOT NULL CHECK (strength BETWEEN 1 AND 10),
  source          text CHECK (source IN ('market','customer','competitor','internal')),
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- No RLS required — private two-person tool
-- ============================================================
