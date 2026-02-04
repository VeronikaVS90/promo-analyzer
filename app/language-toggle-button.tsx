"use client";

import { useLanguage } from "./language-context";

export function LanguageToggleButton() {
    const { language, setLanguage } = useLanguage();

    return (
        <button
      onClick={() => setLanguage(language === "en" ? "ua" : "en")}
      className="px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
      aria-label="Toggle language"
    >
      {language === "en" ? "🇬🇧 EN" : "🇺🇦 UA"}
    </button>
  );
}