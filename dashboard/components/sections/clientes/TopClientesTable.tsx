import ChartCard from "./ChartCard";
import type { TopClientePoint } from "./types";
import { formatBRLPrecise, formatInt } from "./utils";

interface TopClientesTableProps {
  data: TopClientePoint[];
}

/**
 * Top clientes por receita total no período. Nota de privacidade: nunca exibe
 * `nome_cliente` — apenas rank, estado e id mascarado (últimos 4 caracteres),
 * conforme decisão registrada em docs/TASKS.md.
 */
export default function TopClientesTable({ data }: TopClientesTableProps) {
  return (
    <ChartCard
      title="Clientes de maior valor"
      subtitle="Top 8 por receita no período — identificação mascarada por privacidade"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-muted">
              <th className="py-2 pr-4 font-medium">#</th>
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 text-right font-medium">Pedidos</th>
              <th className="py-2 pr-0 text-right font-medium">Receita</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.idMascarado} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 text-ink-secondary tabular-nums">{row.rank}</td>
                <td className="py-2 pr-4 font-mono text-ink-secondary">{row.idMascarado}</td>
                <td className="py-2 pr-4 text-ink-primary">{row.estado}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-ink-primary">
                  {formatInt(row.nPedidos)}
                </td>
                <td className="py-2 pr-0 text-right tabular-nums font-semibold text-ink-primary">
                  {formatBRLPrecise(row.receitaTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
