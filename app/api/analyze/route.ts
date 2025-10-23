import { NextResponse } from "next/server";
import OpenAI from "openai";

// Ініціалізуємо OpenAI клієнт, але поки не створюємо екземпляр
let openai: OpenAI;

// Перевіряємо наявність ключа
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: Request) {
  // Переносимо перевірку всередину, щоб помилка була у форматі JSON
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a marketing expert. Analyze the provided promotional text. Identify its strengths and weaknesses. Offer specific suggestions for improvement regarding keywords, tone, and the effectiveness of the call-to-action (CTA).",
        },
        {
          role: "user",
          content: `Analyze the following text: "${text}"`,
        },
      ],
    });
    const analysis = response.choices[0].message.content;

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}
