"use client";

import { useMemo, useState } from "react";
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
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, preferences }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Failed to analyze text");
  }
  const data = await res.json();
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

  const analyzeMutation = useMutation({
    mutationFn: async ({ t, p }: { t: string; p?: Preferences }) => {
      return await analyzeText(t, p);
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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === "file") {
      if (!file) return;
      await parseMutation.mutateAsync(file);
    } else {
      if (!text.trim()) return;
    }

    const textToAnalyze = mode === "file" ? text : text;
    if (textToAnalyze.trim()) {
      analyzeMutation.mutate({ t: textToAnalyze, p: preferences });
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
          AI-powered promotional content analysis: CTR, EMV, PAS, SEO, CTA, style, and more.
        </p>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("text")}
            className={`px-4 py-2 rounded ${
              mode === "text" ? "bg-blue-600 text-white" : "bg-muted"
            }`}
          >
            Paste text
          </button>
          <button
            onClick={() => setMode("file")}
            className={`px-4 py-2 rounded ${
              mode === "file" ? "bg-blue-600 text-white" : "bg-muted"
            }`}
          >
            Upload file (.pdf / .docx / .txt)
          </button>
        </div>

        <form onSubmit={onSubmit} className="w-full space-y-3">
          {mode === "text" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste text for analysis..."
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
              placeholder="Brand style (Apple, Nike, Tesla...) — optional"
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
              <option value="">Tone — optional</option>
              <option value="formal">formal</option>
              <option value="friendly">friendly</option>
              <option value="expert">expert</option>
              <option value="blogger">blogger</option>
              <option value="medical">medical</option>
              <option value="simple">simple words</option>
            </select>
          </div>

          <button
            type="submit"
            className="mt-1 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-all duration-200"
            disabled={analyzeMutation.isPending || parseMutation.isPending}
          >
            {analyzeMutation.isPending || parseMutation.isPending
              ? "Analyzing..."
              : "Analyze"}
          </button>
        </form>

        <div className="mt-8 w-full space-y-8">
          {(analyzeMutation.isPending || parseMutation.isPending) && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              Processing...
            </div>
          )}

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

          {analyzeMutation.data && analyzeMutation.data.headline && (
            <AnalysisResults
              data={analyzeMutation.data}
              highlighted={highlighted}
            />
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
  if (!data || !data.headline) {
    return <div className="text-red-500">Error: invalid data structure</div>;
  }

  return (
      <>
        {/* Headline / CTR */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">Headline: EMV & CTR</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Stat label="EMV" value={data.headline.emvScore} />
            <Stat
              label="CTR Potential"
              value={data.headline.ctrPrediction.score}
            />
            <Stat label="Why" value="—" sub={data.headline.why} />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-1">Better alternatives:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <b>Expert:</b> {data.headline.alternatives.expert}
              </li>
              <li>
                <b>Emotional:</b> {data.headline.alternatives.emotional}
              </li>
              <li>
                <b>Sales:</b> {data.headline.alternatives.sales}
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
              <b>Add benefits:</b>{" "}
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
              label="Long Sentences"
              value={data.salesMistakes.longSentences?.length || 0}
            />
            <Stat
              label="Generic Phrases"
              value={data.salesMistakes.genericPhrases?.length || 0}
            />
            <Stat
              label="Filler Words"
              value={data.salesMistakes.fillerWords?.length || 0}
            />
            <Stat
              label="Cliches"
              value={data.salesMistakes.cliches?.length || 0}
            />
          </div>
          <div className="text-sm mt-2">
            Water: <b>{data.salesMistakes.waterPercentage}%</b>
          </div>
        </section>

        {/* SEO */}
        <section className="bg-background p-6 border border-border rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">SEO Coverage</h2>
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <Stat label="Coverage" value={data.seo.coverage} />
            <List label="Keywords" items={data.seo.keywords} />
            <List label="LSI" items={data.seo.lsiSuggestions} />
          </div>
          {!!data.seo.missingKeywords?.length && (
            <div className="text-sm mt-2">
              <b>Add:</b> {data.seo.missingKeywords.join(", ")}
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
                  : ["No variants"]
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
            <Stat label="Emotionality" value={data.dashboard.emotionality} />
            <Stat label="Benefit-power" value={data.dashboard.benefitPower} />
            <Stat label="PAS" value={data.dashboard.pas} />
            <Stat label="SEO" value={data.dashboard.seo} />
            <Stat label="Uniqueness" value={data.dashboard.uniqueness} />
            <Stat label="Overall" value={data.dashboard.overall} />
          </div>
        </section>
      </>
    );
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
        Quality: <b>{data.quality}</b>
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
