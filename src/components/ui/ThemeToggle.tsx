"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !isDark;
    root.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <button
      type="button"
      role="button"
      aria-pressed={isDark}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md
                 hover:bg-[var(--hover-bg)]"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.8 1.8-1.8zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zm9-10v-2h3v2h-3zm-1.76 7.16l1.8 1.79 1.79-1.79-1.79-1.8-1.8 1.8zM12 6a6 6 0 100 12 6 6 0 000-12zm7-1.16l1.79-1.8-1.79-1.79-1.8 1.79 1.8 1.8zM4.84 19.24l-1.8 1.79 1.79 1.79 1.8-1.79-1.79-1.79z"
          />
        </svg>
      )}
    </button>
  );
}
