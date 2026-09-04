"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categorical, gridline, axisBaseline, ink, chartSurface } from "@/lib/design-system";
import ChartCard from "./ChartCard";
import { useThemeMode } from "./useThemeMode";
import type { CanalVenda, WeekPoint } from "./types";
import { CHANNEL_LABEL, formatBRL, formatBRLPrecise } from "./utils";

interface RevenueTrendChartProps {
  data: WeekPoint[];
}

/** Receita semanal decomposta por canal — mostra o quão estável é a base de
 * receita ao longo da janela de dados disponível (~1 mês). */
export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const mode = useThemeMode();
  const [ecommerceColor, lojaColor] = categorical[mode];

  return (
    <ChartCard
      title="Receita semanal por canal"
      subtitle="Soma de quantidade × preço unitário, agrupada por semana e canal de venda"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="vendas-ecommerce-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ecommerceColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ecommerceColor} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="vendas-loja-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lojaColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={lojaColor} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridline[mode]} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={axisBaseline[mode]}
              tick={{ fill: ink.secondary[mode], fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              stroke={axisBaseline[mode]}
              tick={{ fill: ink.secondary[mode], fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value: number) => formatBRL(value)}
              width={72}
            />
            <Tooltip
              contentStyle={{
                background: chartSurface[mode],
                border: `1px solid ${gridline[mode]}`,
                borderRadius: 8,
                color: ink.primary[mode],
                fontSize: 12,
              }}
              labelStyle={{ color: ink.secondary[mode] }}
              formatter={(value: number, name: string) => [
                formatBRLPrecise(value),
                CHANNEL_LABEL[name as CanalVenda],
              ]}
              labelFormatter={(label: string) => `Semana de ${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: ink.secondary[mode] }}
              formatter={(value: string) => CHANNEL_LABEL[value as CanalVenda]}
            />
            <Area
              type="monotone"
              dataKey="ecommerce"
              stackId="canal"
              stroke={ecommerceColor}
              strokeWidth={2}
              fill="url(#vendas-ecommerce-fill)"
            />
            <Area
              type="monotone"
              dataKey="loja_fisica"
              stackId="canal"
              stroke={lojaColor}
              strokeWidth={2}
              fill="url(#vendas-loja-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
