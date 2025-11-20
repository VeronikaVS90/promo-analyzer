import { NextResponse } from "next/server";
import OpenAI from "openai";

// Лінивий інстанс
let openai: OpenAI;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: Request) {
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const { text, preferences } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const systemPrompt =
      "You are a senior marketing analyst. Output STRICT JSON only. No markdown, no explanations outside JSON.";
    const userPrompt = `
Analyze the promotional text and return STRICT JSON matching this schema:

{
  "headline": {
    "emvScore": number,                    // 0-100
    "ctrPrediction": { "score": number, "rationale": string }, // 0-100
    "why": string,
    "alternatives": { "expert": string, "emotional": string, "sales": string }
  },
  "benefitsFeatures": {
    "features": string[],
    "benefits": string[],
    "ratio": { "benefits": number, "features": number },       // % totals sum ~100
    "missingBenefits": string[],
    "highlights": Array<{ "start": number, "end": number, "type": "benefit"|"feature" }>
  },
  "pas": {
    "problem":   { "present": boolean, "quality": number, "feedback": string }, // 0-100
    "agitation": { "present": boolean, "quality": number, "feedback": string },
    "solution":  { "present": boolean, "quality": number, "feedback": string },
    "recommendations": string[]
  },
  "salesMistakes": {
    "longSentences": Array<{ "sentence": string, "length": number, "start": number, "end": number }>,
    "genericPhrases": string[],
    "fillerWords": string[],
    "cliches": string[],
    "waterPercentage": number                                  // 0-100
  },
  "seo": {
    "keywords": string[],
    "coverage": number,                                        // 0-100
    "missingKeywords": string[],
    "lsiSuggestions": string[]
  },
  "cta": {
    "suggestions": Array<{ "text": string, "context": string }>
  },
  "tone": {
    "variants": Array<{
      "tone": "formal"|"friendly"|"expert"|"blogger"|"medical"|"simple",
      "text": string
    }>
  },
  "writeLike": {
    "brandStyles": Array<{
      "brand": "Apple"|"Nike"|"Tesla"|"Netflix"|"Pfizer"|"Instagram blogger",
      "text": string
    }>
  },
  "dashboard": {
    "ctr": number,
    "emotionality": number,
    "benefitPower": number,
    "pas": number,
    "seo": number,
    "uniqueness": number,
    "overall": number
  },
  "structure": {
    "blocks": Array<{ "type": "heading"|"selling"|"list"|"cta"|"paragraph", "start": number, "end": number }>
  }
}

Text:
"""${text}"""

Consider optional preferences (may be null):
${JSON.stringify(preferences ?? {}, null, 2)}

Rules:
- Provide numeric scores as integers 0-100 where relevant.
- "highlights" and "blocks" use 0-based char indexes over the ORIGINAL input text.
- "alternatives" must be meaningfully different.
- "writeLike" must respect brand voice faithfully.
- Return VALID JSON only.
`;

    const response = await openai.chat.completions.create({
      // lightweight, cheap, good for JSON
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const json = tryParseJson(raw);

    if (!json) {
      return NextResponse.json(
        { error: "Model returned non-JSON output" },
        { status: 502 }
      );
    }

    return NextResponse.json(json);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}

function tryParseJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    // Try to extract the largest JSON object
    const match = s.match(/\{[\s\S]*\}$/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
