import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VendasSection from "@/components/sections/vendas/VendasSection";

const rangeMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: (..._cols: unknown[]) => ({
        range: (from: number, to: number) => rangeMock(from, to),
      }),
    }),
  },
}));

describe("VendasSection", () => {
  beforeEach(() => {
    rangeMock.mockReset();
  });

  it("mostra estado de carregando antes da resposta do Supabase", () => {
    rangeMock.mockReturnValue(new Promise(() => {})); // nunca resolve
    render(<VendasSection />);
    expect(screen.getByText(/carregando dados de vendas/i)).toBeInTheDocument();
  });

  it("renderiza os KPIs apos carregar os dados com sucesso (1 pagina)", async () => {
    rangeMock.mockResolvedValue({
      data: [
        {
          data_venda: "2025-12-15",
          canal_venda: "ecommerce",
          quantidade: 2,
          preco_unitario: 100,
          produtos: { categoria: "Moda", nome_produto: "Camisa", marca: "MarcaA" },
        },
        {
          data_venda: "2025-12-16",
          canal_venda: "loja_fisica",
          quantidade: 1,
          preco_unitario: 50,
          produtos: { categoria: "Esporte", nome_produto: "Bola", marca: "MarcaB" },
        },
      ],
      error: null,
    });

    render(<VendasSection />);

    await waitFor(() =>
      expect(screen.queryByText(/carregando dados de vendas/i)).not.toBeInTheDocument()
    );

    expect(screen.getByText("Vendas & Receita")).toBeInTheDocument();
    expect(screen.getByText("Receita total")).toBeInTheDocument();
    expect(screen.getByText("R$ 250,00")).toBeInTheDocument(); // 2*100 + 1*50
  });

  it("mostra a mensagem real do Supabase quando a query falha", async () => {
    rangeMock.mockResolvedValue({
      data: null,
      error: { message: "conexão recusada" },
    });

    render(<VendasSection />);

    // `fetchAllVendas` faz `throw error` com o objeto PostgrestError (não um
    // `Error`) -- `extractErrorMessage` (utils.ts, mesmo padrão do achado C1 em
    // clientes) lê `.message` mesmo sem ser instanceof Error.
    await waitFor(() =>
      expect(screen.getByText(/erro ao carregar dados de vendas/i)).toBeInTheDocument()
    );
    const errorParagraph = screen.getByText(/erro ao carregar dados de vendas/i).closest("p");
    expect(errorParagraph?.textContent).toContain("conexão recusada");
  });

  // Regressão do achado I2 (docs/qa-findings.md): a query de vendas não paginava
  // e o PostgREST corta em 1000 linhas por padrão -- os KPIs eram calculados
  // sobre só ~1/3 dos dados reais (3020 linhas), sem nenhum erro visível.
  it("pagina via range() quando há mais de 1000 vendas (regressão do bug de paginação)", async () => {
    const totalVendas = 1005;
    // Alterna entre 2 produtos para que nenhum produto isolado (TopProductsList)
    // some o mesmo total que a receita geral (KpiHero) -- evita texto duplicado.
    const vendasFixture = Array.from({ length: totalVendas }, (_, i) => ({
      data_venda: "2025-12-15",
      canal_venda: "ecommerce" as const,
      quantidade: 1,
      preco_unitario: 10,
      produtos:
        i % 2 === 0
          ? { categoria: "Moda", nome_produto: "Camisa", marca: "MarcaA" }
          : { categoria: "Esporte", nome_produto: "Bola", marca: "MarcaB" },
    }));

    rangeMock.mockImplementation((from: number, to: number) =>
      Promise.resolve({ data: vendasFixture.slice(from, to + 1), error: null })
    );

    render(<VendasSection />);

    await waitFor(() =>
      expect(screen.queryByText(/carregando dados de vendas/i)).not.toBeInTheDocument()
    );

    // 2 chamadas de range() (0-999 e 1000-1999) -- prova que buscou as 1005
    // linhas em vez de parar nas primeiras 1000 que o PostgREST devolveria.
    expect(rangeMock.mock.calls).toHaveLength(2);
    expect(rangeMock.mock.calls[0]).toEqual([0, 999]);
    expect(rangeMock.mock.calls[1]).toEqual([1000, 1999]);

    // Receita total = 1005 * (1 * 10) = 10050 -- reflete as 1005 linhas, não só 1000.
    expect(screen.getByText("R$ 10.050,00")).toBeInTheDocument();
  });
});
