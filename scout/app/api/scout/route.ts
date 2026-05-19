import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function loadApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}


const FIND_PROMPT = (data: {
  audience: string;
  budget: string;
  type: string;
  extra: string;
}) => `You are a sharp product research expert who has helped dozens of founders find winning products. Be specific, data-informed, and honest.

Based on this founder's situation, identify 5 winning product opportunities:

Audience / Niche: ${data.audience}
Budget to start: ${data.budget}
Product type preference: ${data.type}
Additional context: ${data.extra || "none"}

Return ONLY a valid JSON array (no markdown, no explanation) with exactly 5 products:
[
  {
    "name": "product name",
    "emoji": "single relevant emoji",
    "tagline": "one compelling sentence that makes you want to build it",
    "whyItFits": "2-3 sentences on why this specifically fits their situation, audience, and budget",
    "opportunity": "Low" | "Medium" | "High",
    "competition": "Low" | "Medium" | "High",
    "margin": "e.g. 65-80%",
    "trend": "Growing" | "Stable" | "Declining",
    "trendNote": "one line on the trend with a specific data point or signal",
    "startupCost": "realistic cost range e.g. £300-800",
    "timeToFirstSale": "realistic timeframe e.g. 2-4 weeks",
    "firstMove": "the single most important first action to take"
  }
]`;

const VALIDATE_PROMPT = (data: {
  idea: string;
  customer: string;
  problem: string;
  extra: string;
}) => `You are a brutal but fair business analyst. Your job is to stress test product ideas and give honest verdicts. Do not sugarcoat. Do not be needlessly negative. Be specific.

Product idea: ${data.idea}
Target customer: ${data.customer}
Problem it solves: ${data.problem}
Additional context: ${data.extra || "none"}

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "score": <integer 1-10>,
  "verdict": "Strong" | "Promising" | "Risky" | "Avoid",
  "verdictLine": "one honest sentence summing up the verdict",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "competitors": [
    { "name": "competitor name", "note": "one line on what they do and their weakness" },
    { "name": "competitor name", "note": "one line on what they do and their weakness" },
    { "name": "competitor name", "note": "one line on what they do and their weakness" }
  ],
  "marketSize": "realistic market size estimate with context",
  "biggestRisk": "the single most likely reason this fails",
  "recommendation": "2-3 sentences of honest strategic advice",
  "firstSteps": ["step 1", "step 2", "step 3"]
}`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = loadApiKey();

    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set in .env.local" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const body = await req.json();
    const { mode, data } = body;

    if (!mode || !data) {
      return NextResponse.json({ error: "Missing mode or data" }, { status: 400 });
    }

    const prompt = mode === "find" ? FIND_PROMPT(data) : VALIDATE_PROMPT(data);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result: parsed });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
