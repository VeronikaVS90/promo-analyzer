"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid server-side rendering to prevent hydration errors
    return <div style={{ width: "24px", height: "24px" }} />;
  }

  const isDarkMode = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDarkMode ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {isDarkMode ? "🌙" : "☀️"}
    </button>
  );
}
