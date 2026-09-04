"use client";

import { usePricingData } from "./usePricingData";
import PricingKpiCards from "./PricingKpiCards";
import PricingCategoryChart from "./PricingCategoryChart";
import PricingBandChart from "./PricingBandChart";
import PricingOutlierTable from "./PricingOutlierTable";

export default function PricingSection() {
  const { loading, error, produtos, categorias } = usePricingData();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-ink-primary">Pricing & Posicionamento Competitivo</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
          Comparação do preço próprio contra a média dos concorrentes monitorados (snapshot de 2026-01-11,
          não série histórica). A base não tem coluna de custo — os números abaixo descrevem posicionamento
          de preço vs. mercado, não margem contábil.
        </p>
      </header>

      {error && (
        <div className="rounded-card border border-border bg-surface p-6 text-sm text-status-critical">
          Erro ao carregar dados de pricing: {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-card border border-border bg-surface p-6 text-sm text-ink-muted">
          Carregando dados de pricing…
        </div>
      )}

      {!loading && !error && (
        <>
          <PricingKpiCards produtos={produtos} />
          <PricingBandChart produtos={produtos} />
          <div className="grid grid-cols-1 gap-4">
            <PricingCategoryChart categorias={categorias} />
          </div>
          <PricingOutlierTable produtos={produtos} />
        </>
      )}
    </section>
  );
}
