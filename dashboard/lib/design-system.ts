/**
 * Tokens de dataviz compartilhados entre as 3 seções (vendas, pricing, clientes).
 * Fonte: skill `dataviz`, references/palette.md (paleta validada — CVD-safe,
 * ordem fixa, não ciclar). Specialists devem importar daqui em vez de
 * hardcodar hex nos próprios componentes Recharts.
 *
 * CSS (layout/texto/superfícies) usa as CSS vars em app/globals.css via
 * classes Tailwind (bg-surface, text-ink-primary, etc.) — elas trocam sozinhas
 * entre light/dark. Recharts precisa de hex literal em props (fill/stroke),
 * por isso os arrays abaixo têm par light/dark explícito.
 */

export const categorical = {
  light: [
    "#2a78d6", // 1 blue
    "#eb6834", // 2 orange
    "#1baf7a", // 3 aqua
    "#eda100", // 4 yellow
    "#e87ba4", // 5 magenta
    "#008300", // 6 green
    "#4a3aa7", // 7 violet
    "#e34948", // 8 red
  ],
  dark: [
    "#3987e5",
    "#d95926",
    "#199e70",
    "#c98500",
    "#d55181",
    "#008300",
    "#9085e9",
    "#e66767",
  ],
} as const;

// Regra: até 3 séries em gráficos all-pairs (scatter/bubble/small multiples),
// até 8 em stacks/bars/lines adjacentes. Acima disso, dobrar em "Outros" ou facetar.

export const sequentialBlue = {
  light: ["#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6", "#1c5cab", "#0d366b"],
  dark: ["#cde2fb", "#9ec5f4", "#5598e7", "#3987e5", "#1c5cab", "#0d366b"],
} as const;

export const diverging = {
  negative: { light: "#2a78d6", dark: "#3987e5" }, // pólo azul
  positive: { light: "#e34948", dark: "#e66767" }, // pólo vermelho
  midpoint: { light: "#f0efec", dark: "#383835" },
} as const;

export const status = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export const chartSurface = {
  light: "#fcfcfb",
  dark: "#1a1a19",
} as const;

export const ink = {
  primary: { light: "#0b0b0b", dark: "#ffffff" },
  secondary: { light: "#52514e", dark: "#c3c2b7" },
  muted: { light: "#898781", dark: "#898781" },
} as const;

export const gridline = { light: "#e1e0d9", dark: "#2c2c2a" } as const;
export const axisBaseline = { light: "#c3c2b7", dark: "#383835" } as const;

/** Espaçamento em escala 4px — usar via classes Tailwind (p-4, gap-6, etc.) */
export const spacingScale = [4, 8, 12, 16, 24, 32, 48, 64] as const;

/** Tipografia — mesma fonte sans do sistema em toda a UI, inclusive números hero. */
export const fontStack =
  'system-ui, -apple-system, "Segoe UI", sans-serif';

export type ThemeMode = "light" | "dark";

/** Helper para pegar a cor certa de uma série categórica pelo índice + tema. */
export function getSeriesColor(index: number, mode: ThemeMode = "light"): string {
  const palette = categorical[mode];
  return palette[index % palette.length];
}
