"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ThemeToggleButton } from "./theme-toggle-button";

type Highlight = { start: number; end: number; type: "benefit" | "feature" };
type Block = {
  type: "heading" | "selling" | "list" | "cta" | "paragraph";
  start: number;
  end: number;
};

type Preferences = { brand?: string; tone?: string };

type Analysis = {
  headline: {
    emvScore: number;
    ctrPrediction: { score: number; rationale: string };
    why: string;
    alternatives: { expert: string; emotional: string; sales: string };
  };
  benefitsFeatures: {
    features: string[];
    benefits: string[];
    ratio: { benefits: number; features: number };
    missingBenefits: string[];
    highlights: Highlight[];
  };
  pas: {
    problem: { present: boolean; quality: number; feedback: string };
    agitation: { present: boolean; quality: number; feedback: string };
    solution: { present: boolean; quality: number; feedback: string };
    recommendations: string[];
  };
  salesMistakes: {
    longSentences: Array<{
      sentence: string;
      length: number;
      start: number;
      end: number;
    }>;
    genericPhrases: string[];
    fillerWords: string[];
    cliches: string[];
    waterPercentage: number;
  };
  seo: {
    keywords: string[];
    coverage: number;
    missingKeywords: string[];
    lsiSuggestions: string[];
  };
  cta: { suggestions: Array<{ text: string; context: string }> };
  tone: { variants: Array<{ tone: string; text: string }> };
  writeLike: { brandStyles: Array<{ brand: string; text: string }> };
  dashboard: {
    ctr: number;
    emotionality: number;
    benefitPower: number;
    pas: number;
    seo: number;
    uniqueness: number;
    overall: number;
  };
  structure: { blocks: Block[] };
};

async function analyzeText(
  text: string,
  preferences?: Preferences
): Promise<Analysis> {
  console.log("🔵 [API] Sending request to /api/analyze");
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, preferences }),
  });
  console.log("🔵 [API] Response status:", res.status, res.statusText);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    console.error("🔴 [API] Error response:", e);
    throw new Error(e.error || "Failed to analyze text");
  }
  const data = await res.json();
  console.log("✅ [API] Analysis response received:", {
    hasData: !!data,
    hasHeadline: !!data?.headline,
    keys: Object.keys(data || {}),
    headlineKeys: data?.headline ? Object.keys(data.headline) : [],
  });
  return data;
}

async function parseFile(
  file: File
): Promise<{ text: string; structure?: { blocks: Block[] } }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/parse", { method: "POST", body: fd });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Failed to parse file");
  }
  return res.json();
}

export default function HomePage() {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preferences, setPreferences] = useState<
    { brand?: string; tone?: string } | undefined
  >();
  const [debugInfo, setDebugInfo] = useState<string>("");

  const analyzeMutation = useMutation({
    mutationFn: async ({ t, p }: { t: string; p?: Preferences }) => {
      console.log("🔵 [MUTATION] Starting analysis...");
      setDebugInfo("Starting analysis...");
      try {
        const result = await analyzeText(t, p);
        console.log("🔵 [MUTATION] Analysis completed:", {
          hasData: !!result,
          hasHeadline: !!result?.headline,
          headlineKeys: result?.headline ? Object.keys(result.headline) : [],
        });
        setDebugInfo(`Analysis completed. Has headline: ${!!result.headline}`);
        return result;
      } catch (error) {
        console.error("🔴 [MUTATION] Error:", error);
        setDebugInfo(
          `Analysis error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("✅ [MUTATION] onSuccess called:", {
        hasData: !!data,
        hasHeadline: !!data?.headline,
        dataKeys: data ? Object.keys(data) : [],
      });
      setDebugInfo(
        `Mutation onSuccess. Has data: ${!!data}, Has headline: ${!!data?.headline}`
      );
    },
    onError: (error) => {
      console.error("🔴 [MUTATION] onError called:", error);
      setDebugInfo(
        `Mutation onError: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    },
  });

  const parseMutation = useMutation({
    mutationFn: parseFile,
    onSuccess: (data) => {
      setText(data.text || "");
    },
  });

  const highlighted = useMemo(() => {
    const result = analyzeMutation.data;
    if (!result?.benefitsFeatures?.highlights?.length)
      return [{ text, type: "text" as const }];
    return applyHighlights(text, result.benefitsFeatures.highlights);
  }, [text, analyzeMutation.data]);

  // Update debug info when data changes
  useEffect(() => {
    if (analyzeMutation.data) {
      console.log("🟡 [EFFECT] analyzeMutation.data changed:", {
        hasData: !!analyzeMutation.data,
        hasHeadline: !!analyzeMutation.data?.headline,
        isSuccess: analyzeMutation.isSuccess,
        isPending: analyzeMutation.isPending,
        isError: analyzeMutation.isError,
      });
      // Use setTimeout to avoid synchronous setState
      setTimeout(() => {
        setDebugInfo(
          `Data received! Has headline: ${!!analyzeMutation.data.headline}`
        );
      }, 0);
    }
  }, [analyzeMutation.data]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("🔵 [SUBMIT] Form submitted", {
      mode,
      textLength: text.length,
      hasFile: !!file,
    });

    if (mode === "file") {
      if (!file) {
        console.log("🔴 [SUBMIT] No file selected");
        return;
      }
      console.log("🔵 [SUBMIT] Parsing file...");
      await parseMutation.mutateAsync(file);
    } else {
      if (!text.trim()) {
        console.log("🔴 [SUBMIT] No text provided");
        return;
      }
    }

    const textToAnalyze = mode === "file" ? text : text;
    if (textToAnalyze.trim()) {
      console.log(
        "🔵 [SUBMIT] Starting analysis with text length:",
        textToAnalyze.length
      );
      analyzeMutation.mutate({ t: textToAnalyze, p: preferences });
    } else {
      console.log("🔴 [SUBMIT] No text to analyze");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-background text-foreground transition-colors">
      <div className="w-full max-w-5xl">
        <div className="absolute top-4 right-4">
          <ThemeToggleButton />
        </div>

        <h1 className="text-4xl font-bold text-center text-foreground mb-2">
          PromoAnalyzer 📝
        </h1>
        <p className="text-center text-foreground/70 mb-8">
          AI-аналіз промо-текстів: CTR, EMV, PAS, SEO, CTA, стиль та ще більше.
        </p>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("text")}
            className={`px-4 py-2 rounded ${
              mode === "text" ? "bg-blue-600 text-white" : "bg-muted"
            }`}
          >
            Вставити текст
          </button>
          <button
            onClick={() => setMode("file")}
            className={`px-4 py-2 rounded ${
              mode === "file" ? "bg-blue-600 text-white" : "bg-muted"
            }`}
          >
            Завантажити файл (.pdf / .docx / .txt)
          </button>
        </div>

        <form onSubmit={onSubmit} className="w-full space-y-3">
          {mode === "text" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Вставте текст для аналізу..."
              className="w-full h-48 p-4 border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-background text-foreground"
              disabled={analyzeMutation.isPending || parseMutation.isPending}
            />
          ) : (
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full"
              disabled={analyzeMutation.isPending || parseMutation.isPending}
            />
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="border border-border rounded px-3 py-2 bg-background"
              placeholder="Бренд-стиль (Apple, Nike, Tesla...) — опціонально"
              onChange={(e) =>
                setPreferences((p) => ({
                  ...(p || {}),
                  brand: e.target.value || undefined,
                }))
              }
            />
            <select
              className="border border-border rounded px-3 py-2 bg-background"
              onChange={(e) =>
                setPreferences((p) => ({
                  ...(p || {}),
                  tone: e.target.value || undefined,
                }))
              }
              defaultValue=""
            >
              <option value="">Тон — опціонально</option>
              <option value="formal">формальний</option>
              <option value="friendly">дружній</option>
              <option value="expert">експертний</option>
              <option value="blogger">блогерський</option>
              <option value="medical">медичний</option>
              <option value="simple">простими словами</option>
            </select>
          </div>

          <button
            type="submit"
            onClick={() => {
              console.log("🔵 [BUTTON] Button clicked!");
            }}
            className="mt-1 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-all duration-200"
            disabled={analyzeMutation.isPending || parseMutation.isPending}
          >
            {analyzeMutation.isPending || parseMutation.isPending
              ? "Аналіз..."
              : "Проаналізувати"}
          </button>
        </form>

        <div className="mt-8 w-full space-y-8">
          {(analyzeMutation.isPending || parseMutation.isPending) && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              Обробка...
            </div>
          )}

          {/* Debug info */}
          <div className="text-xs text-gray-500 p-2 border rounded mb-4">
            <div>
              <strong>Debug State:</strong>
            </div>
            <div>isSuccess={String(analyzeMutation.isSuccess)}</div>
            <div>isError={String(analyzeMutation.isError)}</div>
            <div>isPending={String(analyzeMutation.isPending)}</div>
            <div>hasData={String(!!analyzeMutation.data)}</div>
            <div>hasHeadline={String(!!analyzeMutation.data?.headline)}</div>
            {debugInfo && (
              <div className="mt-2 text-blue-600">
                <strong>Debug Info:</strong> {debugInfo}
              </div>
            )}
            {analyzeMutation.data && (
              <div className="mt-2">
                <strong>Data preview:</strong>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(analyzeMutation.data, null, 2).substring(
                    0,
                    500
                  )}
                </pre>
              </div>
            )}
          </div>

          {analyzeMutation.isError && (
            <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-500/50 dark:text-red-400 px-4 py-3 rounded-lg">
              <strong className="font-bold">Error: </strong>
              <span>
                {analyzeMutation.error instanceof Error
                  ? analyzeMutation.error.message
                  : String(analyzeMutation.error)}
              </span>
            </div>
          )}

          {/* Render analysis results - FORCE RENDER */}
          {analyzeMutation.data && (
            <div className="space-y-4 mt-4">
              <div className="bg-green-500 text-white p-4 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">
                  ✅ РЕЗУЛЬТАТИ АНАЛІЗУ
                </h2>
                <p>isSuccess: {String(analyzeMutation.isSuccess)}</p>
                <p>hasData: {String(!!analyzeMutation.data)}</p>
                <p>hasHeadline: {String(!!analyzeMutation.data?.headline)}</p>
              </div>

              {analyzeMutation.data.headline ? (
                <>
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded border-2 border-blue-500">
                    <h3 className="text-xl font-bold mb-2">Заголовок</h3>
                    <p className="text-lg">
                      <strong>EMV Score:</strong>{" "}
                      {analyzeMutation.data.headline.emvScore}
                    </p>
                    <p className="text-lg">
                      <strong>CTR:</strong>{" "}
                      {analyzeMutation.data.headline.ctrPrediction.score}
                    </p>
                    <p className="text-sm mt-2">
                      <strong>Чому:</strong> {analyzeMutation.data.headline.why}
                    </p>
                  </div>

                  <AnalysisResults
                    data={analyzeMutation.data}
                    highlighted={highlighted}
                  />
                </>
              ) : (
                <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded border-2 border-yellow-500">
                  <p className="font-bold">
                    ⚠️ Дані отримано, але структура некоректна.
                  </p>
                  <p className="text-sm mt-2">
                    Ключі: {Object.keys(analyzeMutation.data).join(", ")}
                  </p>
                  <pre className="text-xs mt-2 overflow-auto max-h-60 bg-gray-100 p-2 rounded">
                    {JSON.stringify(analyzeMutation.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Show when no data but not pending */}
          {!analyzeMutation.data &&
            !analyzeMutation.isPending &&
            analyzeMutation.isSuccess && (
              <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded border-2 border-yellow-500 mt-4">
                <p>⚠️ isSuccess=true, але даних немає</p>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}

function AnalysisResults({
  data,
  highlighted,
}: {
  data: Analysis;
  highlighted: Array<{ text: string; type: "text" | "benefit" | "feature" }>;
}) {
  console.log("🟢 [AnalysisResults] Rendering with data:", {
    hasData: !!data,
    hasHeadline: !!data?.headline,
    headlineKeys: data?.headline ? Object.keys(data.headline) : [],
  });

  // Safety check
  if (!data || !data.headline) {
    console.error("🔴 [AnalysisResults] Invalid data structure");
    return <div className="text-red-500">Error: Invalid data structure</div>;
  }

  try {
    console.log("🟢 [AnalysisResults] Rendering sections...");
    return (
      <>
        {/* Headline / CTR */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">Заголовок: EMV та CTR</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Stat label="EMV" value={data.headline.emvScore} />
            <Stat
              label="CTR потенціал"
              value={data.headline.ctrPrediction.score}
            />
            <Stat label="Чому так" value="—" sub={data.headline.why} />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-1">Кращі варіанти:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <b>Експертний:</b> {data.headline.alternatives.expert}
              </li>
              <li>
                <b>Емоційний:</b> {data.headline.alternatives.emotional}
              </li>
              <li>
                <b>Продаючий:</b> {data.headline.alternatives.sales}
              </li>
            </ul>
          </div>
        </section>

        {/* Benefits vs Features */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">Benefits vs Features</h2>
          <div className="mb-2">
            <span className="mr-3">
              Benefits: <b>{data.benefitsFeatures.ratio.benefits}%</b>
            </span>
            <span>
              Features: <b>{data.benefitsFeatures.ratio.features}%</b>
            </span>
          </div>
          <div className="rounded border p-3 text-sm leading-7">
            {highlighted.map((seg, i) =>
              seg.type === "text" ? (
                <span key={i}>{seg.text}</span>
              ) : (
                <span
                  key={i}
                  className={
                    seg.type === "benefit"
                      ? "bg-green-200 dark:bg-green-900/40"
                      : "bg-blue-200 dark:bg-blue-900/40"
                  }
                >
                  {seg.text}
                </span>
              )
            )}
          </div>
          {!!data.benefitsFeatures.missingBenefits?.length && (
            <div className="mt-2 text-sm">
              <b>Додати вигоди:</b>{" "}
              {data.benefitsFeatures.missingBenefits.join("; ")}
            </div>
          )}
        </section>

        {/* PAS */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">
            Problem → Agitation → Solution
          </h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <PasCell title="Problem" data={data.pas.problem} />
            <PasCell title="Agitation" data={data.pas.agitation} />
            <PasCell title="Solution" data={data.pas.solution} />
          </div>
          {!!data.pas.recommendations?.length && (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {data.pas.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Sales mistakes */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">Sales Mistakes</h2>
          <div className="grid md:grid-cols-4 gap-3 text-sm">
            <Stat
              label="Довгі речення"
              value={data.salesMistakes.longSentences?.length || 0}
            />
            <Stat
              label="Загальні фрази"
              value={data.salesMistakes.genericPhrases?.length || 0}
            />
            <Stat
              label="Слова-паразити"
              value={data.salesMistakes.fillerWords?.length || 0}
            />
            <Stat
              label="Кліше"
              value={data.salesMistakes.cliches?.length || 0}
            />
          </div>
          <div className="text-sm mt-2">
            Вода: <b>{data.salesMistakes.waterPercentage}%</b>
          </div>
        </section>

        {/* SEO */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">SEO Coverage</h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <Stat label="Покриття" value={data.seo.coverage} />
            <List label="Ключові" items={data.seo.keywords} />
            <List label="LSI" items={data.seo.lsiSuggestions} />
          </div>
          {!!data.seo.missingKeywords?.length && (
            <div className="text-sm mt-2">
              <b>Додати:</b> {data.seo.missingKeywords.join(", ")}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">AI CTA Optimizer</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {data.cta.suggestions.map((s, i) => (
              <li key={i}>
                <b>{s.text}</b>{" "}
                <span className="opacity-70">— {s.context}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tone & Write Like */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">Tone / Write Like…</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <List
              label="Tone variants"
              items={data.tone.variants.map((v) => `${v.tone}: ${v.text}`)}
            />
            <List
              label="Brand styles"
              items={
                data.writeLike.brandStyles?.length > 0
                  ? data.writeLike.brandStyles.map(
                      (b) => `${b.brand}: ${b.text}`
                    )
                  : ["Немає варіантів"]
              }
            />
          </div>
        </section>

        {/* Dashboard */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">
            Content Score Dashboard
          </h2>
          <div className="grid md:grid-cols-4 gap-3 text-sm">
            <Stat label="CTR" value={data.dashboard.ctr} />
            <Stat label="Емоційність" value={data.dashboard.emotionality} />
            <Stat label="Benefit-power" value={data.dashboard.benefitPower} />
            <Stat label="PAS" value={data.dashboard.pas} />
            <Stat label="SEO" value={data.dashboard.seo} />
            <Stat label="Унікальність" value={data.dashboard.uniqueness} />
            <Stat label="Загальний" value={data.dashboard.overall} />
          </div>
        </section>
      </>
    );
  } catch (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded">
        <strong>Error rendering analysis:</strong> {String(error)}
      </div>
    );
  }
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="border border-border rounded p-3">
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-2xl font-semibold">
        {typeof value === "number" ? `${value}` : value}
      </div>
      {sub && (
        <div className="text-xs opacity-70 mt-1 whitespace-pre-wrap">{sub}</div>
      )}
    </div>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="border border-border rounded p-3">
      <div className="text-sm opacity-70 mb-1">{label}</div>
      <ul className="list-disc pl-5 text-sm space-y-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function PasCell({
  title,
  data,
}: {
  title: string;
  data: { present: boolean; quality: number; feedback: string };
}) {
  return (
    <div className="border border-border rounded p-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div
          className={`text-xs px-2 py-0.5 rounded ${
            data.present ? "bg-green-500/20" : "bg-red-500/20"
          }`}
        >
          {data.present ? "✔" : "✘"}
        </div>
      </div>
      <div className="text-sm mt-1">
        Якість: <b>{data.quality}</b>
      </div>
      <div className="text-xs opacity-70 mt-1 whitespace-pre-wrap">
        {data.feedback}
      </div>
    </div>
  );
}

function applyHighlights(text: string, hl: Highlight[]) {
  // Normalize & merge overlaps
  const sorted = [...hl].sort((a, b) => a.start - b.start);
  const chunks: Array<{ text: string; type: "text" | "benefit" | "feature" }> =
    [];
  let cursor = 0;

  for (const h of sorted) {
    const s = Math.max(0, Math.min(text.length, h.start));
    const e = Math.max(0, Math.min(text.length, h.end));
    if (s > cursor) chunks.push({ text: text.slice(cursor, s), type: "text" });
    if (e > s) chunks.push({ text: text.slice(s, e), type: h.type });
    cursor = Math.max(cursor, e);
  }
  if (cursor < text.length)
    chunks.push({ text: text.slice(cursor), type: "text" });
  return chunks;
}
