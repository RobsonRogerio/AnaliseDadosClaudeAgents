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
import {
  axisBaseline,
  chartSurface,
  gridline,
  ink,
  sequentialBlue,
} from "@/lib/design-system";
import ChartCard from "./ChartCard";
import { useThemeMode } from "./useThemeMode";
import type { EstadoPoint } from "./types";
import { formatInt } from "./utils";

interface GeoDistributionChartProps {
  data: EstadoPoint[];
}

/** Distribuição geográfica: nº de clientes cadastrados por estado (top 8 + Outros). */
export default function GeoDistributionChart({ data }: GeoDistributionChartProps) {
  const mode = useThemeMode();
  const maxN = Math.max(1, ...data.map((d) => d.nClientes));
  const steps = sequentialBlue[mode];

  return (
    <ChartCard
      title="Clientes por estado"
      subtitle="Top 8 estados por nº de clientes cadastrados + Outros"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
          barCategoryGap={2}
        >
          <CartesianGrid
            horizontal={false}
            stroke={gridline[mode]}
            strokeDasharray="0"
          />
          <XAxis
            type="number"
            tick={{ fill: ink.secondary[mode], fontSize: 12 }}
            axisLine={{ stroke: axisBaseline[mode] }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="estado"
            width={56}
            tick={{ fill: ink.primary[mode], fontSize: 12 }}
            axisLine={{ stroke: axisBaseline[mode] }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: gridline[mode] }}
            contentStyle={{
              background: chartSurface[mode],
              border: `1px solid ${axisBaseline[mode]}`,
              borderRadius: 8,
              fontSize: 12,
              color: ink.primary[mode],
            }}
            formatter={(value: number) => [`${formatInt(value)} clientes`, ""]}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="nClientes" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((entry) => {
              const intensity = entry.nClientes / maxN;
              const stepIndex = Math.min(
                steps.length - 1,
                Math.max(1, Math.round(intensity * (steps.length - 1)))
              );
              return <Cell key={entry.estado} fill={steps[stepIndex]} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
