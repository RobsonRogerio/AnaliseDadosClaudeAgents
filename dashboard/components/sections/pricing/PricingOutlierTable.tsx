import { status as statusColors } from "@/lib/design-system";
import type { ProdutoPricing } from "./usePricingData";

interface Props {
  produtos: ProdutoPricing[];
}

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OutlierList({
  title,
  description,
  items,
  accentColor,
}: {
  title: string;
  description: string;
  items: ProdutoPricing[];
  accentColor: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} aria-hidden />
        <h3 className="text-sm font-medium text-ink-primary">{title}</h3>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-ink-muted">
              <th className="pb-2 pr-3 font-medium">Produto</th>
              <th className="pb-2 pr-3 font-medium">Categoria</th>
              <th className="pb-2 pr-3 font-medium text-right">Preço</th>
              <th className="pb-2 pr-3 font-medium text-right">Média concorr.</th>
              <th className="pb-2 font-medium text-right">Índice</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id_produto} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 text-ink-primary">{p.nome_produto}</td>
                <td className="py-2 pr-3 text-ink-secondary">{p.categoria}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                  {formatBRL(p.preco_atual)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                  {formatBRL(p.media_concorrente)}
                </td>
                <td className="py-2 text-right tabular-nums font-medium" style={{ color: accentColor }}>
                  {p.indice.toFixed(2)}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PricingOutlierTable({ produtos }: Props) {
  const risco = [...produtos].sort((a, b) => b.indice - a.indice).slice(0, 8);
  const oportunidade = [...produtos].sort((a, b) => a.indice - b.indice).slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <OutlierList
        title="Maior risco de preço"
        description="Produtos mais caros que a concorrência — candidatos a revisão de preço ou justificativa de posicionamento."
        items={risco}
        accentColor={statusColors.critical}
      />
      <OutlierList
        title="Maior oportunidade de preço"
        description="Produtos mais baratos que a concorrência — espaço potencial para reajuste sem perder competitividade."
        items={oportunidade}
        accentColor={statusColors.good}
      />
    </div>
  );
}
