import { NextResponse } from "next/server";
import OpenAI from "openai";

// Provider configuration
type Provider = "openai" | "ollama" | "groq";

function getProvider(): Provider {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase() as Provider;
  if (["openai", "ollama", "groq"].includes(provider)) {
    return provider;
  }
  return "openai";
}

// Lazy OpenAI instance
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Groq client (uses OpenAI-compatible API)
let groqClient: OpenAI | null = null;
if (process.env.GROQ_API_KEY) {
  groqClient = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

async function callAIProvider(
  provider: Provider,
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<string> {
  switch (provider) {
    case "ollama": {
      const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
      const ollamaModel = model || process.env.OLLAMA_MODEL || "llama3.2";
      
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          options: { temperature: 0.4 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || "";
    }

    case "groq": {
      if (!groqClient) {
        throw new Error("Groq API key is not configured. Set GROQ_API_KEY in .env.local");
      }
      const groqModel = model || process.env.GROQ_MODEL || "llama-3.1-8b-instant";
      
      const response = await groqClient.chat.completions.create({
        model: groqModel,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      return response.choices?.[0]?.message?.content || "";
    }

    case "openai":
    default: {
      if (!openai) {
        throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY in .env.local");
      }
      const openaiModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
      
      const response = await openai.chat.completions.create({
        model: openaiModel,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      return response.choices?.[0]?.message?.content || "";
    }
  }
}

export async function POST(request: Request) {
  const provider = getProvider();
  
  // Check provider-specific requirements
  if (provider === "openai" && !openai) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Set OPENAI_API_KEY in .env.local, or use AI_PROVIDER=ollama for free local models." },
      { status: 500 }
    );
  }
  
  if (provider === "groq" && !groqClient) {
    return NextResponse.json(
      { error: "Groq API key is not configured. Set GROQ_API_KEY in .env.local, or use AI_PROVIDER=ollama for free local models." },
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

    // Call the appropriate AI provider
    const raw = await callAIProvider(provider, systemPrompt, userPrompt);
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
