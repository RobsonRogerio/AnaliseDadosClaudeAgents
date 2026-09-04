"use client";

import { useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/design-system";

function resolveThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return "dark";
  if (attr === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Resolve o tema atual (data-theme no <html> ou prefers-color-scheme) para
 * escolher a paleta light/dark de `lib/design-system.ts` nos gráficos Recharts. */
export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(resolveThemeMode());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => setMode(resolveThemeMode());
    media.addEventListener("change", onMediaChange);

    const observer = new MutationObserver(() => setMode(resolveThemeMode()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      media.removeEventListener("change", onMediaChange);
      observer.disconnect();
    };
  }, []);

  return mode;
}
