import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, energy, clarity } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are an asymmetric opportunity extractor. Analyse this brain dump and extract all opportunities, goals, tasks, and beliefs embedded in it.

Brain dump:
"""
${text}
"""

Mental state when written: Energy ${energy}/10, Clarity ${clarity}/10

Scoring rules (apply strictly):
- Opportunity Score = (upside×2 − downside − effort×0.5) / 1.75, clamped 1-10
- asymmetric: upside ≥ 8 AND downside ≤ 3
- easy_win: upside ≥ 6 AND effort ≤ 3
- grind: upside ≥ 7 AND effort > 7
- trap: upside < 5 AND effort > 7
- standard: everything else

For each item, also determine:
- verdict: "do" or "dont" — based purely on asymmetric logic, not emotion
- verdict_reason: one punchy sentence. No fluff. Challenge bad ideas directly.

Also extract:
- dominant_theme: what is this person's brain actually fixated on?
- mental_state_note: how does their energy/clarity level affect the quality of thinking in this dump?
- do_summary: one sentence on the single most important DO from this dump
- dont_summary: one sentence on the single most important DON'T from this dump

Return ONLY valid JSON, no markdown:
{
  "items": [
    {
      "type": "opportunity" | "goal" | "task" | "belief",
      "content": "clear, specific description (not a quote, your synthesis)",
      "upside": <1-10>,
      "downside": <1-10>,
      "effort": <1-10>,
      "score": <1-10>,
      "category": "asymmetric" | "easy_win" | "grind" | "trap" | "standard",
      "verdict": "do" | "dont",
      "verdict_reason": "one sentence"
    }
  ],
  "dominant_theme": "...",
  "mental_state_note": "...",
  "do_summary": "...",
  "dont_summary": "..."
}`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Parse failed" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
