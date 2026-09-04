"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CategoryRevenueChart from "./CategoryRevenueChart";
import ChannelMixChart from "./ChannelMixChart";
import InsightCallout from "./InsightCallout";
import KpiHero from "./KpiHero";
import RevenueTrendChart from "./RevenueTrendChart";
import TopProductsList from "./TopProductsList";
import type { VendaRow, VendasSummary } from "./types";
import { extractErrorMessage, summarizeVendas } from "./utils";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: VendasSummary };

const PAGE_SIZE = 1000;

/** Busca todas as linhas de `vendas` via paginação (contorna o limite default
 * de 1000 linhas do PostgREST) — necessário aqui pois `vendas` tem 3020 linhas. */
async function fetchAllVendas(): Promise<VendaRow[]> {
  const rows: VendaRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("vendas")
      .select(
        "data_venda, canal_venda, quantidade, preco_unitario, produtos(categoria, nome_produto, marca)"
      )
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as unknown as VendaRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export default function VendasSection() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const rows = await fetchAllVendas();
        if (!cancelled) {
          setState({ status: "ready", summary: summarizeVendas(rows) });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", message: extractErrorMessage(err) });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="vendas-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="vendas-heading" className="text-xl font-semibold text-ink-primary">
          Vendas & Receita
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Visão executiva de receita, canal e mix de produto no período
          disponível.
        </p>
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-ink-muted">Carregando dados de vendas…</p>
      )}

      {state.status === "error" && (
        <div className="rounded-card border border-border bg-surface p-6">
          <p className="flex items-center gap-2 text-sm text-status-critical">
            <span aria-hidden>⚠</span>
            <span>Erro ao carregar dados de vendas: {state.message}</span>
          </p>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <KpiHero summary={state.summary} />

          <RevenueTrendChart data={state.summary.porSemana} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChannelMixChart data={state.summary.porCanal} />
            <TopProductsList data={state.summary.topProdutos} />
          </div>

          <CategoryRevenueChart data={state.summary.porCategoria} />

          <InsightCallout
            porCanal={state.summary.porCanal}
            porCategoria={state.summary.porCategoria}
          />
        </>
      )}
    </section>
  );
}
