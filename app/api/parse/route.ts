import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || "").toLowerCase();

    let text = "";
    if (name.endsWith(".txt")) {
      text = buf.toString("utf8");
    } else if (name.endsWith(".docx")) {
      const res = await mammoth.extractRawText({ buffer: buf });
      text = res.value || "";
    } else if (name.endsWith(".pdf")) {
      const res = await parsePdf(buf);
      text = res.text || "";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // block markup

    const blocks = segmentBlocks(text);

    return NextResponse.json({ text, structure: { blocks } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}

async function parsePdf(buf: Buffer) {
  type PdfParseFn = (data: Buffer | Uint8Array) => Promise<{ text: string }>;
  type PdfParseModuleShape = { default?: PdfParseFn } | PdfParseFn;
  const mod = (await import("pdf-parse")) as PdfParseModuleShape;

  let fn: PdfParseFn;
  if (typeof mod === "function") {
    fn = mod as PdfParseFn;
  } else if (typeof mod.default === "function") {
    fn = mod.default as PdfParseFn;
  } else {
    throw new Error("Invalid pdf-parse export shape");
  }

  return fn(buf);
}

function segmentBlocks(text: string) {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{
    type: "heading" | "selling" | "list" | "cta" | "paragraph";
    start: number;
    end: number;
  }> = [];
  let idx = 0;

  for (const line of lines) {
    const start = idx;
    const end = idx + line.length;
    const trimmed = line.trim();

    let type: "heading" | "selling" | "list" | "cta" | "paragraph" =
      "paragraph";
    if (/^#{1,6}\s+/.test(trimmed) || /^[A-Z].{0,60}$/.test(trimmed))
      type = "heading";
    else if (/^[-*•]\s+/.test(trimmed)) type = "list";
    else if (
      /\b(buy now|order|sign up|register|get started|куп(іть|и)|замов(ити|ляй)|реєструйся)\b/i.test(
        trimmed
      )
    )
      type = "cta";
    else if (
      /\b(save|results|benefit|economy|free|бонус|вигода|економія|результат)\b/i.test(
        trimmed
      )
    )
      type = "selling";

    blocks.push({ type, start, end });
    idx = end + 1; // + newline
  }
  return blocks;
}
