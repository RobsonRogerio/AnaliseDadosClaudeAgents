import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PricingSection from "@/components/sections/pricing/PricingSection";

const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: (...args: unknown[]) => fromMock(table, ...args),
    }),
  },
}));

const produtos = [
  { id_produto: "P1", nome_produto: "Produto 1", categoria: "Moda", marca: "A", preco_atual: 100 },
  { id_produto: "P2", nome_produto: "Produto 2", categoria: "Esporte", marca: "B", preco_atual: 50 },
];

// P1: media (80+120)/2 = 100 -> indice 1.00 (alinhado)
// P2: media 60 -> indice 50/60 = 0.8333 (muito_abaixo, < 0.95)
const competidores = [
  { id_produto: "P1", preco_concorrente: 80 },
  { id_produto: "P1", preco_concorrente: 120 },
  { id_produto: "P2", preco_concorrente: 60 },
];

function mockSuccess() {
  fromMock.mockImplementation((table: string) => {
    if (table === "produtos") return Promise.resolve({ data: produtos, error: null });
    if (table === "preco_competidores") return Promise.resolve({ data: competidores, error: null });
    throw new Error(`tabela inesperada: ${table}`);
  });
}

describe("PricingSection", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("mostra estado de carregando antes da resposta do Supabase", () => {
    fromMock.mockReturnValue(new Promise(() => {}));
    render(<PricingSection />);
    expect(screen.getByText(/carregando dados de pricing/i)).toBeInTheDocument();
  });

  it("calcula indice de competitividade e KPIs apos carregar produtos + concorrentes", async () => {
    mockSuccess();
    render(<PricingSection />);

    await waitFor(() =>
      expect(screen.queryByText(/carregando dados de pricing/i)).not.toBeInTheDocument()
    );

    // 0 de 2 produtos acima do mercado (P1 = 1.00x alinhado, P2 = 0.83x muito_abaixo)
    expect(screen.getByText("0%")).toBeInTheDocument();
    // indice medio = (1.00 + 0.8333) / 2 = 0.9167 -> "0.92x"
    expect(screen.getByText("0.92x")).toBeInTheDocument();
    // "Em risco de preço" (muito_acima) = 0, "Oportunidade de preço" (muito_abaixo) = 1
    expect(screen.getByText("Em risco de preço").parentElement?.parentElement?.textContent).toContain("0");
    expect(screen.getByText("Oportunidade de preço").parentElement?.parentElement?.textContent).toContain("1");
  });

  it("mostra mensagem de erro quando alguma das duas queries falha", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "produtos") return Promise.resolve({ data: null, error: { message: "falha ao buscar produtos" } });
      return Promise.resolve({ data: competidores, error: null });
    });

    render(<PricingSection />);

    await waitFor(() =>
      expect(screen.getByText(/erro ao carregar dados de pricing/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/falha ao buscar produtos/i)).toBeInTheDocument();
  });

  it("ignora produtos sem cobertura de concorrente (fora da análise)", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "produtos") {
        return Promise.resolve({
          data: [...produtos, { id_produto: "P3", nome_produto: "Produto 3", categoria: "Casa", marca: "C", preco_atual: 30 }],
          error: null,
        });
      }
      return Promise.resolve({ data: competidores, error: null }); // sem linha pra P3
    });

    render(<PricingSection />);

    await waitFor(() =>
      expect(screen.queryByText(/carregando dados de pricing/i)).not.toBeInTheDocument()
    );

    // continua contando só 2 produtos com cobertura (0 de 2, não 0 de 3)
    expect(screen.getByText(/0 de 2 produtos/i)).toBeInTheDocument();
  });
});
