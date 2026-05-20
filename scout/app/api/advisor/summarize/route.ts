import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUMMARIZE_PROMPT = `You are summarizing a founder advisory session. Extract exactly this JSON structure — no markdown, no explanation, just raw JSON:

{
  "summary": "2-3 sentence summary of what was discussed and decided",
  "key_decisions": [
    { "decision": "what was decided", "rationale": "why", "asymmetry": "what upside this unlocks" }
  ],
  "commitments": [
    { "action": "specific thing they said they'd do", "deadline": "when (or null)", "goal_related": "which goal this serves (or null)" }
  ],
  "mental_state": "one word: focused/scattered/energised/drained/uncertain/clear",
  "momentum": "up/down/neutral",
  "north_star_progress": "brief note on whether this session moved them closer or further from their main goal"
}

Only include decisions and commitments that were explicitly stated. If none, use empty arrays.`;

export async function POST(req: NextRequest) {
  // Verify authenticated
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  // Load the session
  const { data: session } = await supabase
    .from("advisor_sessions")
    .select("messages, user_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = session.messages as Array<{ role: string; content: string }>;
  if (messages.length < 2) {
    // Not enough to summarize
    await supabase.from("advisor_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    return NextResponse.json({ ok: true, skipped: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const client = new Anthropic({ apiKey });

  // Build transcript for Claude to summarize
  const transcript = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SUMMARIZE_PROMPT,
      messages: [{ role: "user", content: `Summarize this advisory session:\n\n${transcript}` }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();

    // Parse JSON — strip any accidental markdown fences
    const cleaned = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);

    await supabase.from("advisor_sessions").update({
      summary:              parsed.summary ?? null,
      key_decisions:        parsed.key_decisions ?? [],
      commitments:          parsed.commitments ?? [],
      momentum:             parsed.momentum ?? null,
      mental_state:         parsed.mental_state ?? null,
      north_star_progress:  parsed.north_star_progress ?? null,
      ended_at:             new Date().toISOString(),
    }).eq("id", sessionId);

    return NextResponse.json({ ok: true, summary: parsed.summary });
  } catch (err) {
    console.error("Summarize error:", err);
    // Still mark session as ended even if summarization fails
    await supabase.from("advisor_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    return NextResponse.json({ ok: true, skipped: true });
  }
}
