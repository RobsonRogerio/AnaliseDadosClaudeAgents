"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  axisBaseline,
  categorical,
  chartSurface,
  gridline,
  ink,
} from "@/lib/design-system";
import ChartCard from "./ChartCard";
import { useThemeMode } from "./useThemeMode";
import type { PerfilCanalPoint } from "./types";
import { formatInt } from "./utils";

interface ChannelProfileChartProps {
  data: PerfilCanalPoint[];
}

/**
 * Perfil de canal: segmentação comportamental dos clientes ativos pela % da
 * receita própria feita via e-commerce (>=70% / 30-70% / <=30%). Cada barra é
 * uma categoria de identidade distinta, por isso cor categórica (não sequencial).
 */
export default function ChannelProfileChart({ data }: ChannelProfileChartProps) {
  const mode = useThemeMode();
  const palette = categorical[mode];

  return (
    <ChartCard
      title="Perfil de canal dos clientes"
      subtitle="Segmentação pela % da receita do cliente feita via e-commerce"
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 32, bottom: 4, left: 4 }}
        >
          <CartesianGrid horizontal={false} stroke={gridline[mode]} />
          <XAxis
            type="number"
            tick={{ fill: ink.secondary[mode], fontSize: 12 }}
            axisLine={{ stroke: axisBaseline[mode] }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="perfil"
            width={150}
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
          />
          <Bar dataKey="nClientes" radius={[0, 4, 4, 0]} maxBarSize={28}>
            <LabelList
              dataKey="nClientes"
              position="right"
              fill={ink.secondary[mode]}
              fontSize={12}
              formatter={(value: number) => formatInt(value)}
            />
            {data.map((entry, index) => (
              <Cell key={entry.perfil} fill={palette[index % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
