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
import {
  axisBaseline,
  chartSurface,
  gridline,
  ink,
  sequentialBlue,
} from "@/lib/design-system";
import ChartCard from "./ChartCard";
import { useThemeMode } from "./useThemeMode";
import type { CohortPoint } from "./types";
import { formatBRL, formatInt } from "./utils";

interface CadastroCohortChartProps {
  data: CohortPoint[];
}

/**
 * Antiguidade de cadastro: nº de clientes por ano de cadastro e receita média
 * por cliente (na janela de vendas), lado a lado — mesma dimensão (ano de
 * cadastro), escalas diferentes, por isso dois gráficos em vez de eixo duplo.
 */
export default function CadastroCohortChart({ data }: CadastroCohortChartProps) {
  const mode = useThemeMode();
  const barColor = sequentialBlue[mode][3];

  return (
    <ChartCard
      title="Antiguidade de cadastro"
      subtitle="Clientes agrupados pelo ano de cadastro (2022–2025)"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs text-ink-secondary">Nº de clientes</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={gridline[mode]} />
              <XAxis
                dataKey="anoCadastro"
                tick={{ fill: ink.secondary[mode], fontSize: 12 }}
                axisLine={{ stroke: axisBaseline[mode] }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: ink.secondary[mode], fontSize: 12 }}
                axisLine={{ stroke: axisBaseline[mode] }}
                tickLine={false}
                allowDecimals={false}
                width={32}
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
              <Bar dataKey="nClientes" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Receita média por cliente</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={gridline[mode]} />
              <XAxis
                dataKey="anoCadastro"
                tick={{ fill: ink.secondary[mode], fontSize: 12 }}
                axisLine={{ stroke: axisBaseline[mode] }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: ink.secondary[mode], fontSize: 12 }}
                axisLine={{ stroke: axisBaseline[mode] }}
                tickLine={false}
                width={48}
                tickFormatter={(value: number) => formatBRL(value)}
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
                formatter={(value: number) => [formatBRL(value), ""]}
              />
              <Bar
                dataKey="receitaMediaPorCliente"
                fill={barColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
