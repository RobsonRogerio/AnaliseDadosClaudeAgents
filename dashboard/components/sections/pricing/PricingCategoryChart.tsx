"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { diverging, gridline, axisBaseline, ink } from "@/lib/design-system";
import { useThemeMode } from "./useThemeMode";
import type { CategoriaAgregado } from "./usePricingData";

interface Props {
  categorias: CategoriaAgregado[];
}

interface TooltipPayloadItem {
  payload: CategoriaAgregado;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-card border border-border bg-surface p-3 text-sm shadow-sm">
      <div className="font-medium text-ink-primary">{d.categoria}</div>
      <div className="mt-1 text-ink-secondary">
        Índice médio: <span className="tabular-nums">{d.indice_medio.toFixed(2)}x</span>
      </div>
      <div className="text-ink-muted">
        {d.acima} acima · {d.abaixo} abaixo · {d.n_produtos} produtos
      </div>
    </div>
  );
}

export default function PricingCategoryChart({ categorias }: Props) {
  const mode = useThemeMode();
  const data = categorias.map((c) => ({ ...c, delta: c.indice_medio - 1 }));

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <h3 className="text-sm font-medium text-ink-primary">Índice de competitividade por categoria</h3>
      <p className="mt-1 text-xs text-ink-muted">
        Preço próprio ÷ média dos concorrentes. Linha em 1,00x = paridade com o mercado.
      </p>
      <div className="mt-4 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke={gridline[mode]} />
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={(v: number) => `${v.toFixed(1)}x`}
              stroke={axisBaseline[mode]}
              tick={{ fill: ink.secondary[mode], fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="categoria"
              width={100}
              stroke={axisBaseline[mode]}
              tick={{ fill: ink.secondary[mode], fontSize: 12 }}
            />
            <ReferenceLine x={1} stroke={axisBaseline[mode]} strokeDasharray="4 4" />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: gridline[mode], opacity: 0.4 }} />
            <Bar dataKey="indice_medio" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((d) => (
                <Cell
                  key={d.categoria}
                  fill={d.delta >= 0 ? diverging.positive[mode] : diverging.negative[mode]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
