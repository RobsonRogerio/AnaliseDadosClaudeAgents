import type { ClientesKpis } from "./types";
import {
  formatBRLPrecise,
  formatDatePt,
  formatDecimal1,
  formatInt,
  formatPercent,
} from "./utils";

interface KpiRowProps {
  kpis: ClientesKpis;
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

/**
 * Headline da seção: 4 KPIs hero.
 * - Clientes ativos = count(distinct vendas.id_cliente) / count(clientes.id_cliente).
 * - Receita média por cliente = Σ(quantidade × preco_unitario) / clientes ativos.
 * - Ticket médio por pedido = Σ(quantidade × preco_unitario) / count(id_venda).
 * - Pedidos médios por cliente = count(id_venda) / clientes ativos.
 * Fonte: tabelas `clientes` + `vendas` (join por id_cliente).
 */
export default function KpiRow({ kpis }: KpiRowProps) {
  return (
    <div>
      <p className="text-xs text-ink-muted">
        Período de vendas analisado: {formatDatePt(kpis.periodo.inicio)} –{" "}
        {formatDatePt(kpis.periodo.fim)} · base de {formatInt(kpis.totalClientes)}{" "}
        clientes cadastrados
      </p>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Clientes ativos na janela"
          value={`${formatInt(kpis.clientesAtivos)} / ${formatInt(kpis.totalClientes)}`}
          helper={`${formatPercent(kpis.shareAtivos)} da base cadastrada comprou no período`}
        />
        <KpiTile
          label="Receita média por cliente"
          value={formatBRLPrecise(kpis.receitaMediaPorCliente)}
          helper="Receita total ÷ nº de clientes ativos"
        />
        <KpiTile
          label="Ticket médio por pedido"
          value={formatBRLPrecise(kpis.ticketMedioPorPedido)}
          helper="Receita total ÷ nº de pedidos"
        />
        <KpiTile
          label="Pedidos médios por cliente"
          value={formatDecimal1(kpis.pedidosMediosPorCliente)}
          helper="Nº de pedidos ÷ nº de clientes ativos"
        />
      </div>
    </div>
  );
}
