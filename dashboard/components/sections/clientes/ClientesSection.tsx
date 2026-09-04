"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CadastroCohortChart from "./CadastroCohortChart";
import ChannelProfileChart from "./ChannelProfileChart";
import ChartCard from "./ChartCard";
import GeoDistributionChart from "./GeoDistributionChart";
import KpiRow from "./KpiRow";
import TopClientesTable from "./TopClientesTable";
import type { ClienteRow, ClientesSummary, VendaRow } from "./types";
import { extractErrorMessage, summarizeClientes } from "./utils";

const PAGE_SIZE = 1000;

/** Busca todas as linhas de uma tabela via paginação (contorna o limite
 * default de 1000 linhas do PostgREST) — necessário para `vendas` (3020 linhas). */
async function fetchAllRows<T>(
  table: string,
  columns: string
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export default function ClientesSection() {
  const [summary, setSummary] = useState<ClientesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [clientes, vendas] = await Promise.all([
          fetchAllRows<ClienteRow>("clientes", "id_cliente, estado, data_cadastro"),
          fetchAllRows<VendaRow>(
            "vendas",
            "id_cliente, data_venda, canal_venda, quantidade, preco_unitario"
          ),
        ]);
        if (!cancelled) setSummary(summarizeClientes(clientes, vendas));
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section>
        <SectionHeader />
        <ChartCard title="Erro ao carregar dados">
          <p className="text-sm text-status-critical">{error}</p>
        </ChartCard>
      </section>
    );
  }

  if (!summary) {
    return (
      <section>
        <SectionHeader />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-card border border-border bg-surface"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader />
      <div className="mt-6">
        <KpiRow kpis={summary.kpis} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GeoDistributionChart data={summary.porEstado} />
        <ChannelProfileChart data={summary.porPerfilCanal} />
      </div>
      <div className="mt-6">
        <CadastroCohortChart data={summary.porCohort} />
      </div>
      <div className="mt-6">
        <TopClientesTable data={summary.topClientes} />
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <header>
      <h2 className="text-xl font-semibold text-ink-primary">
        Clientes &amp; Comportamento
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Quem compra, de onde e como — perfil geográfico, antiguidade de cadastro
        e preferência de canal da base de 50 clientes.
      </p>
    </header>
  );
}
