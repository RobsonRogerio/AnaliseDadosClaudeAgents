import { status as statusColors } from "@/lib/design-system";
import type { ProdutoPricing } from "./usePricingData";

interface Props {
  produtos: ProdutoPricing[];
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function formatIndice(n: number): string {
  return `${n.toFixed(2)}x`;
}

export default function PricingKpiCards({ produtos }: Props) {
  const total = produtos.length;
  const acima = produtos.filter((p) => p.indice > 1).length;
  const muitoAcima = produtos.filter((p) => p.banda === "muito_acima").length;
  const muitoAbaixo = produtos.filter((p) => p.banda === "muito_abaixo").length;
  const indiceMedio = total > 0 ? produtos.reduce((sum, p) => sum + p.indice, 0) / total : 0;

  const cards = [
    {
      label: "Produtos acima do mercado",
      value: total > 0 ? formatPct(acima / total) : "—",
      detail: `${acima} de ${total} produtos com preço acima da média dos concorrentes`,
    },
    {
      label: "Índice de competitividade médio",
      value: formatIndice(indiceMedio),
      detail: "preço próprio ÷ média dos concorrentes, todos os produtos",
    },
    {
      label: "Em risco de preço",
      value: String(muitoAcima),
      detail: "produtos > 1,15x a média da concorrência",
      dotColor: statusColors.critical,
    },
    {
      label: "Oportunidade de preço",
      value: String(muitoAbaixo),
      detail: "produtos < 0,95x a média da concorrência",
      dotColor: statusColors.good,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-card border border-border bg-surface p-6">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            {card.dotColor && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: card.dotColor }}
                aria-hidden
              />
            )}
            {card.label}
          </div>
          <div className="mt-2 text-3xl font-semibold text-ink-primary">{card.value}</div>
          <div className="mt-1 text-xs text-ink-muted">{card.detail}</div>
        </div>
      ))}
    </div>
  );
}
