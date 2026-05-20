-- ── Advisor memory layer ──────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor if you haven't already.

create table if not exists advisor_sessions (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid references orgs(id) on delete cascade,
  user_id            uuid references auth.users(id) on delete cascade,
  messages           jsonb not null default '[]',
  summary            text,
  key_decisions      jsonb default '[]',
  commitments        jsonb default '[]',
  momentum           text,            -- up / down / neutral
  mental_state       text,            -- focused / scattered / etc.
  north_star_progress text,
  session_date       date not null default current_date,
  ended_at           timestamptz,
  created_at         timestamptz not null default now()
);

-- Indexes
create index if not exists advisor_sessions_user_org
  on advisor_sessions(user_id, org_id, created_at desc);

-- RLS
alter table advisor_sessions enable row level security;

-- Users can only read/write their own sessions
create policy "users manage own sessions"
  on advisor_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Check / add missing columns if table already exists ──────────────────────
-- (safe to run even if table was already created without all columns)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'advisor_sessions' and column_name = 'momentum') then
    alter table advisor_sessions add column momentum text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_name = 'advisor_sessions' and column_name = 'mental_state') then
    alter table advisor_sessions add column mental_state text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_name = 'advisor_sessions' and column_name = 'north_star_progress') then
    alter table advisor_sessions add column north_star_progress text;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_name = 'advisor_sessions' and column_name = 'session_date') then
    alter table advisor_sessions add column session_date date not null default current_date;
  end if;
end $$;
