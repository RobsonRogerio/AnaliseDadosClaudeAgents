import type { VendasSummary } from "./types";
import { formatBRLPrecise, formatDatePt, formatInt, formatPercent } from "./utils";

interface KpiHeroProps {
  summary: VendasSummary;
}

interface KpiTileProps {
  label: string;
  value: string;
  helper: string;
}

function KpiTile({ label, value, helper }: KpiTileProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-primary">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{helper}</p>
    </div>
  );
}

/** Headline da seção: 3 KPIs hero + período coberto pelos dados. */
export default function KpiHero({ summary }: KpiHeroProps) {
  const ecommerce = summary.porCanal.find((c) => c.canal === "ecommerce");

  return (
    <div>
      <p className="text-xs text-ink-muted">
        Período analisado: {formatDatePt(summary.periodo.inicio)} –{" "}
        {formatDatePt(summary.periodo.fim)}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile
          label="Receita total"
          value={formatBRLPrecise(summary.receitaTotal)}
          helper={`${formatInt(summary.nVendas)} vendas no período`}
        />
        <KpiTile
          label="Ticket médio"
          value={formatBRLPrecise(summary.ticketMedio)}
          helper="Receita total ÷ nº de vendas"
        />
        <KpiTile
          label="Unidades vendidas"
          value={formatInt(summary.unidadesTotal)}
          helper={
            ecommerce
              ? `${formatPercent(ecommerce.share)} da receita via e-commerce`
              : "Soma de quantidade em vendas"
          }
        />
      </div>
    </div>
  );
}
