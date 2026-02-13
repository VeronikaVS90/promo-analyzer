"use client";

import { useLanguage } from "./language-context";

type Abbreviation = "EMV" | "CTR" | "PAS" | "SEO" | "CTA" | "LSI";

export function AbbreviationTooltip({ abbr }: { abbr: Abbreviation }) {
  const { t } = useLanguage();
  
  const tooltips: Record<Abbreviation, string> = {
    EMV: t.emvTooltip,
    CTR: t.ctrTooltip,
    PAS: t.pasTooltip,
    SEO: t.seoTooltip,
    CTA: t.ctaTooltip,
    LSI: t.lsiTooltip,
  };

  return (
    <span
      className="underline decoration-dotted cursor-help"
      title={tooltips[abbr]}
    >
      {abbr}
    </span>
  );
}