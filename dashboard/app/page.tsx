import VendasSection from "@/components/sections/vendas/VendasSection";
import PricingSection from "@/components/sections/pricing/PricingSection";
import ClientesSection from "@/components/sections/clientes/ClientesSection";

// Ordem segue o funil de negócio: receita (vendas) -> preço (pricing) -> quem compra (clientes).
export default function Home() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink-primary">
          Dashboard E-commerce
        </h1>
        <p className="mt-2 text-ink-secondary">
          Visão executiva de vendas, pricing e clientes.
        </p>
      </header>

      <VendasSection />

      <div className="border-t border-border" />

      <PricingSection />

      <div className="border-t border-border" />

      <ClientesSection />
    </main>
  );
}
