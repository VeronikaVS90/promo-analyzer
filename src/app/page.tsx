"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ThemeToggleButton } from "./theme-toggle-button";

const analyzeText = async (text: string): Promise<{ analysis: string }> => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch analysis");
  }
  return response.json();
};

export default function HomePage() {
  const [text, setText] = useState("");

  const mutation = useMutation({
    mutationFn: analyzeText,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    mutation.mutate(text);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-background text-foreground transition-colors">
      <div className="w-full max-w-3xl">
        <div className="absolute top-4 right-4">
          <ThemeToggleButton />
        </div>

        <h1 className="text-4xl font-bold text-center text-foreground mb-2">
          PromoAnalyzer 📝
        </h1>
        <p className="text-center text-foreground/70 mb-8">
          Analyze your promotional content to improve its effectiveness.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your promotional text here..."
            className="w-full h-48 p-4 border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-background text-foreground"
            disabled={mutation.isPending}
          />
          <button
            type="submit"
            className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-all duration-200"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Analyzing..." : "Analyze Text"}
          </button>
        </form>

        <div className="mt-8 w-full">
          {mutation.isPending && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>Analyzing, please wait...</p>
            </div>
          )}

          {mutation.isError && (
            <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-500/50 dark:text-red-400 px-4 py-3 rounded-lg">
              <strong className="font-bold">Error: </strong>
              <span>{mutation.error.message}</span>
            </div>
          )}

          {mutation.isSuccess && (
            <div className="bg-background p-6 border border-border rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Analysis Result:
              </h2>
              <p className="text-foreground whitespace-pre-wrap">
                {mutation.data.analysis}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
