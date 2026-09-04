import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/** Wrapper padrão de card de gráfico (docs/TASKS.md — sistema de design comum). */
export default function ChartCard({
  title,
  subtitle,
  children,
  className,
}: ChartCardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-6 ${className ?? ""}`}
    >
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}
