"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { diverging } from "@/lib/design-system";
import { useThemeMode } from "./useThemeMode";
import { bandLabel, type PositionBand, type ProdutoPricing } from "./usePricingData";

interface Props {
  produtos: ProdutoPricing[];
}

const bandOrder: PositionBand[] = ["muito_abaixo", "abaixo", "alinhado", "acima", "muito_acima"];

function bandStyle(mode: "light" | "dark", band: PositionBand): { fill: string; opacity: number } {
  switch (band) {
    case "muito_abaixo":
      return { fill: diverging.negative[mode], opacity: 1 };
    case "abaixo":
      return { fill: diverging.negative[mode], opacity: 0.5 };
    case "alinhado":
      return { fill: diverging.midpoint[mode], opacity: 1 };
    case "acima":
      return { fill: diverging.positive[mode], opacity: 0.5 };
    case "muito_acima":
      return { fill: diverging.positive[mode], opacity: 1 };
  }
}

export default function PricingBandChart({ produtos }: Props) {
  const mode = useThemeMode();
  const total = produtos.length;

  const counts = new Map<PositionBand, number>();
  for (const band of bandOrder) counts.set(band, 0);
  for (const p of produtos) counts.set(p.banda, (counts.get(p.banda) ?? 0) + 1);

  const row: Record<string, number | string> = { name: "Produtos" };
  for (const band of bandOrder) row[band] = counts.get(band) ?? 0;
  const data = [row];

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <h3 className="text-sm font-medium text-ink-primary">Distribuição por posicionamento de preço</h3>
      <p className="mt-1 text-xs text-ink-muted">
        {total} produtos com pelo menos 1 concorrente monitorado, agrupados pelo índice preço próprio ÷ concorrência.
      </p>
      <div className="mt-4 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, total]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(value: number, key: string) => [
                `${value} (${total > 0 ? ((value / total) * 100).toFixed(0) : 0}%)`,
                bandLabel[key as PositionBand],
              ]}
            />
            {bandOrder.map((band) => {
              const style = bandStyle(mode, band);
              return (
                <Bar key={band} dataKey={band} stackId="bands" fill={style.fill} fillOpacity={style.opacity} />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-secondary">
        {bandOrder.map((band) => {
          const style = bandStyle(mode, band);
          const n = counts.get(band) ?? 0;
          return (
            <div key={band} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: style.fill, opacity: style.opacity }}
                aria-hidden
              />
              <span>
                {bandLabel[band]} — <span className="tabular-nums">{n}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
