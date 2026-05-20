import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — create a new session or update messages on existing one
export async function POST(req: NextRequest) {
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, messages, orgId } = await req.json();

  if (sessionId) {
    // Update existing session
    await supabase.from("advisor_sessions")
      .update({ messages })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true, sessionId });
  } else {
    // Create new session
    const { data } = await supabase.from("advisor_sessions")
      .insert({ org_id: orgId, user_id: user.id, messages: messages ?? [] })
      .select("id")
      .single();
    return NextResponse.json({ ok: true, sessionId: data?.id });
  }
}

// GET — load last N sessions for context injection
export async function GET(req: NextRequest) {
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("org_id");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "5");

  // Load last N summarized sessions
  const { data: sessions } = await supabase
    .from("advisor_sessions")
    .select("id, summary, key_decisions, commitments, session_date, momentum, ended_at")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .not("summary", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Load all open commitments (not yet completed)
  const allCommitments: Array<Record<string, unknown>> = [];
  for (const s of sessions ?? []) {
    for (const c of (s.commitments as Array<Record<string, unknown>>) ?? []) {
      if (!c.completed_at) {
        allCommitments.push({ ...c, session_date: s.session_date });
      }
    }
  }

  return NextResponse.json({
    sessions: (sessions ?? []).map(s => ({
      date: s.session_date,
      summary: s.summary,
      key_decisions: s.key_decisions,
      momentum: s.momentum,
    })),
    openCommitments: allCommitments.slice(0, 10),
  });
}
