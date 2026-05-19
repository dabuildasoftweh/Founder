import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function loadApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    return content.match(/^ANTHROPIC_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch { return undefined; }
}

const EASY_PROMPT = (data: Record<string, string>) => `
You are a sharp, friendly business advisor helping a complete beginner find their best path to making money. Be specific, practical, and encouraging without being dishonest. No jargon.

Their situation: ${data.situation}
Time available: ${data.time}
Budget: ${data.budget}
Skills: ${data.skills || "none mentioned"}

Return ONLY a valid JSON array of exactly 3 paths (no markdown, no explanation):
[
  {
    "emoji": "single relevant emoji",
    "title": "short punchy name for this path",
    "tagline": "one sentence that makes it click",
    "whyYou": "2-3 sentences explaining why this specifically fits their situation, skills, and constraints",
    "timeToFirstIncome": "realistic honest timeframe e.g. '4-8 weeks'",
    "startupCost": "realistic cost e.g. 'Under £200'",
    "difficulty": "Beginner" or "Intermediate",
    "firstStep": "the single most important thing to do TODAY — specific, not vague",
    "steps": ["step 1", "step 2", "step 3"]
  }
]`;

const FIND_PROMPT = (data: Record<string, string>) => `
You are a sharp product research expert.

Founder situation: ${data.audience}
Budget: ${data.budget}
Product type preference: ${data.type}
Extra context: ${data.extra || "none"}

Return ONLY a valid JSON array of exactly 5 opportunities (no markdown):
[
  {
    "name": "product/opportunity name",
    "emoji": "single emoji",
    "tagline": "one compelling sentence",
    "whyItFits": "2-3 sentences on why this fits their specific situation, audience, and budget",
    "opportunity": "Low"|"Medium"|"High",
    "competition": "Low"|"Medium"|"High",
    "margin": "e.g. 65-80%",
    "trend": "Growing"|"Stable"|"Declining",
    "trendNote": "one line with a specific data point or signal",
    "startupCost": "e.g. £300-800",
    "timeToFirstSale": "e.g. 2-4 weeks",
    "firstMove": "the single most important first action"
  }
]`;

const VALIDATE_PROMPT = (data: Record<string, string>) => `
You are a brutal but fair business analyst. Do not sugarcoat. Do not be needlessly negative. Be honest and specific.

Idea: ${data.idea}
Target customer: ${data.customer}
Problem solved: ${data.problem}
Extra context: ${data.extra || "none"}

Return ONLY a valid JSON object (no markdown):
{
  "score": <integer 1-100>,
  "verdict": "Strong"|"Promising"|"Risky"|"Avoid",
  "verdictLine": "one brutally honest sentence",
  "executiveSummary": "3-4 sentences giving a balanced, honest overview of the opportunity",
  "keyRecommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3"],
  "problemScore": <integer 1-100>,
  "solutionScore": <integer 1-100>,
  "marketScore": <integer 1-100>,
  "greenLights": ["positive signal 1", "positive signal 2", "positive signal 3", "positive signal 4"],
  "redFlags": ["risk or concern 1", "risk or concern 2", "risk or concern 3", "risk or concern 4"],
  "competitors": [
    {"name": "name", "note": "what they do and their key weakness"},
    {"name": "name", "note": "what they do and their key weakness"},
    {"name": "name", "note": "what they do and their key weakness"}
  ],
  "marketSize": "realistic estimate with context",
  "biggestRisk": "the single most likely reason this fails",
  "recommendation": "2-3 sentences of honest strategic advice",
  "firstSteps": ["step 1", "step 2", "step 3"]
}`;

const LAUNCH_PROMPT = (data: Record<string, string>) => `
You are a world-class startup launch strategist. Be specific, tactical, and realistic. No fluff.

Business idea: ${data.idea}
Current stage: ${data.stage}
Budget: ${data.budget}
Time available per week: ${data.time}
Extra context: ${data.extra || "none"}

Create a tight 90-day launch plan. Be specific to THEIR idea — not generic advice.

Return ONLY a valid JSON object (no markdown):
{
  "headline": "one punchy sentence summarising the 90-day mission",
  "phases": [
    {
      "name": "Phase name e.g. 'Foundation'",
      "duration": "e.g. 'Weeks 1–4'",
      "goal": "what success looks like by end of this phase",
      "tasks": [
        { "week": "Week 1", "action": "specific task", "why": "one line reason" },
        { "week": "Week 2", "action": "specific task", "why": "one line reason" },
        { "week": "Week 3", "action": "specific task", "why": "one line reason" },
        { "week": "Week 4", "action": "specific task", "why": "one line reason" }
      ]
    },
    {
      "name": "Phase 2 name e.g. 'Launch'",
      "duration": "Weeks 5–8",
      "goal": "...",
      "tasks": [
        { "week": "Week 5", "action": "...", "why": "..." },
        { "week": "Week 6", "action": "...", "why": "..." },
        { "week": "Week 7", "action": "...", "why": "..." },
        { "week": "Week 8", "action": "...", "why": "..." }
      ]
    },
    {
      "name": "Phase 3 name e.g. 'Scale'",
      "duration": "Weeks 9–12",
      "goal": "...",
      "tasks": [
        { "week": "Week 9", "action": "...", "why": "..." },
        { "week": "Week 10", "action": "...", "why": "..." },
        { "week": "Week 11", "action": "...", "why": "..." },
        { "week": "Week 12", "action": "...", "why": "..." }
      ]
    }
  ],
  "milestones": [
    { "when": "End of Week 4", "target": "specific measurable milestone" },
    { "when": "End of Week 8", "target": "specific measurable milestone" },
    { "when": "End of Week 12", "target": "specific measurable milestone" }
  ],
  "topPriority": "the single most important thing to nail in the first 2 weeks",
  "biggestTrap": "the most common mistake founders make at this stage and how to avoid it",
  "revenueTarget": "realistic revenue target by week 12 with brief reasoning"
}`;

const BRAND_PROMPT = (data: Record<string, string>) => `
You are a world-class brand strategist. Create a complete brand foundation for this business.

Business idea: ${data.idea}
Target audience: ${data.audience}
Vibe / aesthetic: ${data.vibe}
Existing name ideas: ${data.names || "none"}
Extra context: ${data.extra || "none"}

Be creative, specific, and opinionated. Don't give bland corporate answers.

Return ONLY a valid JSON object (no markdown):
{
  "names": [
    { "name": "brand name", "handle": "@handle suggestion", "domain": "domain.com", "why": "one line on why this name works" },
    { "name": "...", "handle": "...", "domain": "...", "why": "..." },
    { "name": "...", "handle": "...", "domain": "...", "why": "..." },
    { "name": "...", "handle": "...", "domain": "...", "why": "..." },
    { "name": "...", "handle": "...", "domain": "...", "why": "..." }
  ],
  "positioning": "2 sentences: who this is for, what makes it different, why they should care",
  "tagline": "short punchy tagline — 2-6 words",
  "targetCustomer": {
    "who": "specific description of the ideal customer",
    "age": "age range",
    "interests": ["interest 1", "interest 2", "interest 3"],
    "painPoints": ["pain point 1", "pain point 2"],
    "whereTheyHang": ["platform/place 1", "platform/place 2", "platform/place 3"]
  },
  "brandVoice": {
    "tone": "e.g. Bold, witty, no-nonsense",
    "doSay": ["example phrase style 1", "example phrase style 2"],
    "dontSay": ["thing to avoid 1", "thing to avoid 2"]
  },
  "visualDirection": {
    "feel": "one sentence describing the visual vibe",
    "colours": ["colour 1 with hex", "colour 2 with hex", "colour 3 with hex"],
    "fontStyle": "e.g. Bold geometric sans-serif + clean body font"
  },
  "contentAngles": ["content idea 1", "content idea 2", "content idea 3", "content idea 4"]
}`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = loadApiKey();
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set in .env.local" }, { status: 500 });

    const client = new Anthropic({ apiKey });
    const { mode, data } = await req.json();

    if (!mode || !data) return NextResponse.json({ error: "Missing mode or data" }, { status: 400 });

    const prompt =
      mode === "easy"     ? EASY_PROMPT(data) :
      mode === "find"     ? FIND_PROMPT(data) :
      mode === "validate" ? VALIDATE_PROMPT(data) :
      mode === "launch"   ? LAUNCH_PROMPT(data) :
      mode === "brand"    ? BRAND_PROMPT(data) : null;

    if (!prompt) return NextResponse.json({ error: "Unknown mode" }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!match) return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });

    return NextResponse.json({ result: JSON.parse(match[0]) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
