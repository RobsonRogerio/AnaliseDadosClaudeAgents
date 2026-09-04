import ChartCard from "./ChartCard";
import type { ProductSummary } from "./types";
import { formatBRLPrecise, formatInt } from "./utils";

interface TopProductsListProps {
  data: ProductSummary[];
}

/** Ranking dos produtos com maior receita no período. */
export default function TopProductsList({ data }: TopProductsListProps) {
  const maxReceita = data.reduce((max, p) => Math.max(max, p.receita), 0);

  return (
    <ChartCard
      title="Top 5 produtos por receita"
      subtitle="Soma de quantidade × preço unitário, agrupada por produto"
    >
      <ol className="flex flex-col gap-3">
        {data.map((produto, index) => (
          <li key={produto.nomeProduto}>
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {index + 1}. {produto.nomeProduto}
                </p>
                <p className="text-xs text-ink-muted">
                  {produto.categoria} · {produto.marca} ·{" "}
                  {formatInt(produto.unidades)} un.
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-primary">
                {formatBRLPrecise(produto.receita)}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-grid">
              <div
                className="h-1.5 rounded-full bg-ink-primary"
                style={{
                  width: maxReceita > 0 ? `${(produto.receita / maxReceita) * 100}%` : "0%",
                }}
              />
            </div>
          </li>
        ))}
      </ol>
    </ChartCard>
  );
}
