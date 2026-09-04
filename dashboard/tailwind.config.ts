import type { Config } from "tailwindcss";

// Tokens mirror docs/TASKS.md "Sistema de design comum" (paleta dataviz skill).
// Cores lidas via CSS var -> trocam sozinhas entre light/dark (ver app/globals.css).
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface-1)",
        plane: "var(--page-plane)",
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        border: "var(--border-hairline)",
        grid: "var(--gridline)",
        axis: "var(--axis-baseline)",
        status: {
          good: "var(--status-good)",
          warning: "var(--status-warning)",
          serious: "var(--status-serious)",
          critical: "var(--status-critical)",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      spacing: {
        // escala 4px conforme design system
        "4.5": "1.125rem",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
