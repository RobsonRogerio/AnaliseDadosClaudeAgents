import type { CategorySummary, ChannelSummary } from "./types";
import { formatBRLPrecise, formatPercent } from "./utils";

interface InsightCalloutProps {
  porCanal: ChannelSummary[];
  porCategoria: CategorySummary[];
}

/** Fecha a seção com um insight acionável derivado dos KPIs acima. */
export default function InsightCallout({ porCanal, porCategoria }: InsightCalloutProps) {
  const ecommerce = porCanal.find((c) => c.canal === "ecommerce");
  const loja = porCanal.find((c) => c.canal === "loja_fisica");
  const liderCategoria = porCategoria[0];
  const menorCategoria = porCategoria[porCategoria.length - 1];

  if (!ecommerce || !loja || !liderCategoria || !menorCategoria) return null;

  const diferencaTicket = ecommerce.ticketMedio - loja.ticketMedio;

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Insight
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-primary">
        <strong>{liderCategoria.categoria}</strong> concentra{" "}
        {formatPercent(liderCategoria.receita / (liderCategoria.receita + menorCategoria.receita))}{" "}
        da receita combinada com <strong>{menorCategoria.categoria}</strong>, a
        categoria de menor receita ({formatBRLPrecise(menorCategoria.receita)}{" "}
        vs. {formatBRLPrecise(liderCategoria.receita)}) — candidata a revisão de
        sortimento ou preço. No mix de canal, o e-commerce responde por{" "}
        {formatPercent(ecommerce.share)} da receita e ainda tem ticket médio{" "}
        {diferencaTicket >= 0 ? "maior" : "menor"} que a loja física (
        {formatBRLPrecise(ecommerce.ticketMedio)} vs.{" "}
        {formatBRLPrecise(loja.ticketMedio)}), reforçando o canal digital como
        prioridade de investimento comercial.
      </p>
    </div>
  );
}
