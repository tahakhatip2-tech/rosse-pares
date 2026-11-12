"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check saved theme or html class
    const saved = localStorage.getItem("rp_theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      // Default to light mode as requested
      setTheme("light");
      applyTheme("light");
    }
  }, []);

  const applyTheme = (t: "light" | "dark") => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("rp_theme", next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="تبديل مظهر الموقع"
        className={`p-2 rounded-xl transition flex items-center justify-center ${className ?? ""}`}
        style={{
          width: 38,
          height: 38,
          background: "rgba(200, 134, 10, 0.1)",
          border: "1px solid rgba(200, 134, 10, 0.25)",
          color: "#c8860a",
        }}
      >
        <Sun className="w-4 h-4 opacity-70" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
      aria-label={isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
      className={`group relative p-2 rounded-xl transition flex items-center justify-center ${className ?? ""}`}
      style={{
        width: 38,
        height: 38,
        background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(200, 134, 10, 0.12)",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(200, 134, 10, 0.3)",
        color: isDark ? "#f0b429" : "#a36605",
        cursor: "pointer",
      }}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform group-hover:rotate-45 group-hover:scale-110 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12 group-hover:scale-110 text-amber-700" />
      )}
    </button>
  );
}
