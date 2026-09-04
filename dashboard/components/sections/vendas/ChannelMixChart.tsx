"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categorical, gridline, axisBaseline, ink, chartSurface } from "@/lib/design-system";
import ChartCard from "./ChartCard";
import { useThemeMode } from "./useThemeMode";
import type { ChannelSummary } from "./types";
import { formatBRLPrecise, formatPercent } from "./utils";

interface ChannelMixChartProps {
  data: ChannelSummary[];
}

/** Mix de receita e ticket médio por canal (e-commerce vs. loja física). */
export default function ChannelMixChart({ data }: ChannelMixChartProps) {
  const mode = useThemeMode();
  const palette = categorical[mode];

  return (
    <ChartCard
      title="Mix de canal"
      subtitle="Receita e ticket médio por canal de venda"
    >
      <div className="flex flex-col gap-4">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke={gridline[mode]} horizontal={false} />
              <XAxis
                type="number"
                stroke={axisBaseline[mode]}
                tick={{ fill: ink.secondary[mode], fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value: number) => formatPercent(value)}
                domain={[0, 1]}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke={axisBaseline[mode]}
                tick={{ fill: ink.primary[mode], fontSize: 12 }}
                tickLine={false}
                width={88}
              />
              <Tooltip
                contentStyle={{
                  background: chartSurface[mode],
                  border: `1px solid ${gridline[mode]}`,
                  borderRadius: 8,
                  color: ink.primary[mode],
                  fontSize: 12,
                }}
                formatter={(value: number, _name, item) => [
                  `${formatPercent(value)} (${formatBRLPrecise(item.payload.receita)})`,
                  "Receita",
                ]}
              />
              <Bar dataKey="share" radius={[0, 4, 4, 0]} barSize={28}>
                {data.map((entry, index) => (
                  <Cell key={entry.canal} fill={palette[index % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          {data.map((channel, index) => (
            <div
              key={channel.canal}
              className="rounded-card border border-border p-3"
            >
              <dt className="flex items-center gap-2 text-xs text-ink-secondary">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: palette[index % palette.length] }}
                />
                {channel.label} · ticket médio
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-ink-primary">
                {formatBRLPrecise(channel.ticketMedio)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </ChartCard>
  );
}
