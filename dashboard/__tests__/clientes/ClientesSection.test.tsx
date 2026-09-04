import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ClientesSection from "@/components/sections/clientes/ClientesSection";

const rangeMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: (..._cols: unknown[]) => ({
        range: (from: number, to: number) => rangeMock(table, from, to),
      }),
    }),
  },
}));

const clientesFixture = [{ id_cliente: "C1a1", estado: "SP", data_cadastro: "2022-01-01" }];

describe("ClientesSection", () => {
  beforeEach(() => {
    rangeMock.mockReset();
  });

  it("mostra skeleton de carregando antes da resposta do Supabase", () => {
    rangeMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ClientesSection />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("percorre paginacao (range) e agrega todas as paginas de vendas", async () => {
    // 1005 vendas de R$10 cada para 1 unico cliente -> exercita o loop de
    // paginação de fetchAllRows (PAGE_SIZE=1000): 1a página cheia (1000),
    // 2a página parcial (5) encerra o loop.
    const vendasFixture = Array.from({ length: 1005 }, () => ({
      id_cliente: "C1a1",
      data_venda: "2025-12-15",
      canal_venda: "ecommerce" as const,
      quantidade: 1,
      preco_unitario: 10,
    }));

    rangeMock.mockImplementation((table: string, from: number, to: number) => {
      const source = table === "clientes" ? clientesFixture : vendasFixture;
      return Promise.resolve({ data: source.slice(from, to + 1), error: null });
    });

    render(<ClientesSection />);

    await waitFor(() =>
      expect(screen.getByText("1 / 1")).toBeInTheDocument()
    );

    // Chamou range 2x para vendas (0-999 e 1000-1999) -- prova que paginou
    // em vez de truncar em 1000 linhas.
    const vendasCalls = rangeMock.mock.calls.filter(([table]) => table === "vendas");
    expect(vendasCalls).toHaveLength(2);

    // Receita total = 1005 * 10 = 10050, ticket médio por pedido = 10050/1005 = 10.
    expect(screen.getByText("R$ 10,00")).toBeInTheDocument();
  });

  it("mostra a mensagem real do Supabase quando fetchAllRows falha", async () => {
    // `fetchAllRows` faz `throw error` com o objeto PostgrestError (não um `Error`).
    // `extractErrorMessage` (utils.ts) cobre esse caso lendo `.message` mesmo sem
    // ser instanceof Error — ver achado C1 em docs/qa-findings.md (já corrigido).
    rangeMock.mockImplementation((table: string) => {
      if (table === "clientes") return Promise.resolve({ data: clientesFixture, error: null });
      return Promise.resolve({ data: null, error: { message: "timeout de conexão" } });
    });

    render(<ClientesSection />);

    await waitFor(() =>
      expect(screen.getByText(/timeout de conexão/i)).toBeInTheDocument()
    );
  });

  it("usa mensagem generica quando o erro nao tem campo message legivel", async () => {
    rangeMock.mockImplementation((table: string) => {
      if (table === "clientes") return Promise.resolve({ data: clientesFixture, error: null });
      return Promise.reject("falha desconhecida"); // erro que não é objeto nem Error
    });

    render(<ClientesSection />);

    await waitFor(() =>
      expect(screen.getByText("Erro ao carregar dados de clientes")).toBeInTheDocument()
    );
  });
});
