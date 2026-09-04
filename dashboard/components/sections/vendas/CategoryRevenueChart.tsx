"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categorical, gridline, axisBaseline, ink, chartSurface } from "@/lib/design-system";
import ChartCard from "./ChartCard";
import { useThemeMode } from "./useThemeMode";
import type { CategorySummary } from "./types";
import { formatBRL, formatBRLPrecise } from "./utils";

interface CategoryRevenueChartProps {
  data: CategorySummary[];
}

/** Receita por categoria de produto, ordenada da maior para a menor. */
export default function CategoryRevenueChart({ data }: CategoryRevenueChartProps) {
  const mode = useThemeMode();
  const color = categorical[mode][0];

  const chartHeight = Math.max(data.length * 32, 240);

  return (
    <ChartCard
      title="Receita por categoria"
      subtitle="Soma de quantidade × preço unitário, agrupada por categoria do produto"
    >
      <div style={{ height: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke={gridline[mode]} horizontal={false} />
            <XAxis
              type="number"
              stroke={axisBaseline[mode]}
              tick={{ fill: ink.secondary[mode], fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value: number) => formatBRL(value)}
            />
            <YAxis
              type="category"
              dataKey="categoria"
              stroke={axisBaseline[mode]}
              tick={{ fill: ink.primary[mode], fontSize: 12 }}
              tickLine={false}
              width={96}
            />
            <Tooltip
              contentStyle={{
                background: chartSurface[mode],
                border: `1px solid ${gridline[mode]}`,
                borderRadius: 8,
                color: ink.primary[mode],
                fontSize: 12,
              }}
              formatter={(value: number) => [formatBRLPrecise(value), "Receita"]}
            />
            <Bar dataKey="receita" fill={color} radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
