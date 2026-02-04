"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Language, translations } from "./translations";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en | typeof translations.ua;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Load from localStorage on initial render
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language") as Language | null;
      if (saved && (saved === "en" || saved === "ua")) {
        return saved;
      }
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}