import { describe, expect, it } from "vitest";
import {
  extractErrorMessage,
  formatBRL,
  formatBRLPrecise,
  formatDecimal1,
  formatInt,
  formatPercent,
  summarizeClientes,
} from "@/components/sections/clientes/utils";
import type { ClienteRow, VendaRow } from "@/components/sections/clientes/types";

// C1: 2 pedidos ecommerce (100% da receita) -> perfil "Predominante e-commerce"
// C2: 1 pedido loja_fisica (0% ecommerce) -> perfil "Predominante loja física"
// C3: cadastrado mas sem nenhuma venda -> não conta como ativo
const clientes: ClienteRow[] = [
  { id_cliente: "C1a1", estado: "SP", data_cadastro: "2022-01-01" },
  { id_cliente: "C2b2", estado: "SP", data_cadastro: "2023-01-01" },
  { id_cliente: "C3c3", estado: "RJ", data_cadastro: "2022-06-01" },
];

const vendas: VendaRow[] = [
  { id_cliente: "C1a1", data_venda: "2025-12-15", canal_venda: "ecommerce", quantidade: 2, preco_unitario: 100 },
  { id_cliente: "C1a1", data_venda: "2025-12-20", canal_venda: "ecommerce", quantidade: 1, preco_unitario: 50 },
  { id_cliente: "C2b2", data_venda: "2025-12-18", canal_venda: "loja_fisica", quantidade: 1, preco_unitario: 80 },
];

describe("summarizeClientes — KPIs", () => {
  // Fórmulas conforme docs/TASKS.md — seção "Clientes & Comportamento".
  it("calcula clientes ativos como distinct id_cliente em vendas / total cadastrado", () => {
    const summary = summarizeClientes(clientes, vendas);
    expect(summary.kpis.totalClientes).toBe(3);
    expect(summary.kpis.clientesAtivos).toBe(2); // C1, C2 (C3 nunca comprou)
    expect(summary.kpis.shareAtivos).toBeCloseTo(2 / 3, 6);
  });

  it("calcula receita media por cliente ativo", () => {
    const summary = summarizeClientes(clientes, vendas);
    // C1 = 250 (200+50), C2 = 80 -> total 330 / 2 ativos = 165
    expect(summary.kpis.receitaMediaPorCliente).toBeCloseTo(165, 6);
  });

  it("calcula ticket medio por pedido (receita total / numero de pedidos)", () => {
    const summary = summarizeClientes(clientes, vendas);
    // 330 receita / 3 pedidos (2 de C1 + 1 de C2) = 110
    expect(summary.kpis.ticketMedioPorPedido).toBeCloseTo(110, 6);
  });

  it("calcula pedidos medios por cliente ativo", () => {
    const summary = summarizeClientes(clientes, vendas);
    expect(summary.kpis.pedidosMediosPorCliente).toBeCloseTo(1.5, 6);
  });

  it("nao divide por zero quando nao ha clientes ou vendas", () => {
    const summary = summarizeClientes([], []);
    expect(summary.kpis.shareAtivos).toBe(0);
    expect(summary.kpis.receitaMediaPorCliente).toBe(0);
    expect(summary.kpis.ticketMedioPorPedido).toBe(0);
    expect(summary.kpis.pedidosMediosPorCliente).toBe(0);
  });
});

describe("summarizeClientes — distribuição geográfica", () => {
  it("agrupa clientes cadastrados por estado", () => {
    const summary = summarizeClientes(clientes, vendas);
    const sp = summary.porEstado.find((e) => e.estado === "SP");
    const rj = summary.porEstado.find((e) => e.estado === "RJ");
    expect(sp).toMatchObject({ nClientes: 2 });
    expect(rj).toMatchObject({ nClientes: 1 });
  });

  it("agrupa estados alem do top 8 em 'Outros'", () => {
    const muitosClientes: ClienteRow[] = Array.from({ length: 10 }, (_, i) => ({
      id_cliente: `id${i}`,
      estado: `ES${i}`,
      data_cadastro: "2022-01-01",
    }));
    const summary = summarizeClientes(muitosClientes, []);
    expect(summary.porEstado).toHaveLength(9); // top 8 + "Outros"
    expect(summary.porEstado.at(-1)).toMatchObject({ estado: "Outros", nClientes: 2 });
  });
});

describe("summarizeClientes — cohort de cadastro", () => {
  it("agrupa por ano de cadastro com receita media na janela de vendas", () => {
    const summary = summarizeClientes(clientes, vendas);
    const y2022 = summary.porCohort.find((c) => c.anoCadastro === "2022");
    const y2023 = summary.porCohort.find((c) => c.anoCadastro === "2023");

    // 2022: C1 (receita 250) + C3 (receita 0, nunca comprou) -> 2 clientes, media 125
    expect(y2022).toMatchObject({ nClientes: 2, receitaMediaPorCliente: 125 });
    // 2023: C2 (receita 80) -> 1 cliente, media 80
    expect(y2023).toMatchObject({ nClientes: 1, receitaMediaPorCliente: 80 });
  });

  it("ordena cohorts por ano crescente", () => {
    const summary = summarizeClientes(clientes, vendas);
    expect(summary.porCohort.map((c) => c.anoCadastro)).toEqual(["2022", "2023"]);
  });
});

describe("summarizeClientes — perfil de canal", () => {
  it("classifica >=70% de receita via ecommerce como Predominante e-commerce", () => {
    const summary = summarizeClientes(clientes, vendas);
    const perfil = summary.porPerfilCanal.find((p) => p.perfil === "Predominante e-commerce");
    expect(perfil).toMatchObject({ nClientes: 1 }); // C1
  });

  it("classifica <=30% de receita via ecommerce como Predominante loja física", () => {
    const summary = summarizeClientes(clientes, vendas);
    const perfil = summary.porPerfilCanal.find((p) => p.perfil === "Predominante loja física");
    expect(perfil).toMatchObject({ nClientes: 1 }); // C2
  });

  it("classifica entre 30% e 70% como Misto", () => {
    const mistoVendas: VendaRow[] = [
      { id_cliente: "C1a1", data_venda: "2025-12-15", canal_venda: "ecommerce", quantidade: 1, preco_unitario: 50 },
      { id_cliente: "C1a1", data_venda: "2025-12-16", canal_venda: "loja_fisica", quantidade: 1, preco_unitario: 50 },
    ];
    const summary = summarizeClientes(clientes, mistoVendas);
    const perfil = summary.porPerfilCanal.find((p) => p.perfil === "Misto");
    expect(perfil).toMatchObject({ nClientes: 1 });
  });

  it("omite perfis sem nenhum cliente (nao lista categoria com 0)", () => {
    const summary = summarizeClientes(clientes, vendas);
    // ninguem e "Misto" nesta fixture
    expect(summary.porPerfilCanal.find((p) => p.perfil === "Misto")).toBeUndefined();
  });
});

describe("summarizeClientes — top clientes (privacidade)", () => {
  it("rankeia por receita total, do maior para o menor", () => {
    const summary = summarizeClientes(clientes, vendas);
    expect(summary.topClientes[0]).toMatchObject({ rank: 1, receitaTotal: 250, estado: "SP" });
    expect(summary.topClientes[1]).toMatchObject({ rank: 2, receitaTotal: 80, estado: "SP" });
  });

  it("mascara o id do cliente e nunca expoe nome_cliente", () => {
    const summary = summarizeClientes(clientes, vendas);
    expect(summary.topClientes[0].idMascarado).toBe("•••C1a1");
    // ClienteRow nem tem campo nome_cliente -- garantia estrutural via TypeScript,
    // aqui confirmamos que o único identificador exposto é o mascarado.
    expect(Object.keys(summary.topClientes[0])).not.toContain("nome_cliente");
  });

  it("limita a 8 clientes mesmo com mais clientes ativos", () => {
    const muitosClientes: ClienteRow[] = Array.from({ length: 10 }, (_, i) => ({
      id_cliente: `idcli${i}`,
      estado: "SP",
      data_cadastro: "2022-01-01",
    }));
    const muitasVendas: VendaRow[] = muitosClientes.map((c, i) => ({
      id_cliente: c.id_cliente,
      data_venda: "2025-12-15",
      canal_venda: "ecommerce",
      quantidade: 1,
      preco_unitario: 10 + i,
    }));
    const summary = summarizeClientes(muitosClientes, muitasVendas);
    expect(summary.topClientes).toHaveLength(8);
  });
});

describe("extractErrorMessage", () => {
  it("extrai .message de uma instancia de Error", () => {
    expect(extractErrorMessage(new Error("falha de rede"))).toBe("falha de rede");
  });

  it("extrai .message de um objeto plano (ex.: PostgrestError, que nao e instanceof Error)", () => {
    expect(extractErrorMessage({ message: "timeout de conexão", code: "500" })).toBe(
      "timeout de conexão"
    );
  });

  it("usa mensagem generica quando nao ha campo message legivel", () => {
    expect(extractErrorMessage("string qualquer")).toBe("Erro ao carregar dados de clientes");
    expect(extractErrorMessage(null)).toBe("Erro ao carregar dados de clientes");
    expect(extractErrorMessage({ code: 500 })).toBe("Erro ao carregar dados de clientes");
  });
});

describe("formatters", () => {
  it("formatDecimal1 formata com 1 casa decimal fixa", () => {
    expect(formatDecimal1(60.4)).toBe("60,4");
    expect(formatDecimal1(2)).toBe("2,0");
  });

  it("formatBRL arredonda para inteiro", () => {
    expect(formatBRL(19481.56)).toBe("R$ 19.482");
  });

  it("formatBRLPrecise mantem centavos", () => {
    expect(formatBRLPrecise(322.5)).toBe("R$ 322,50");
  });

  it("formatInt formata milhares com separador pt-BR", () => {
    expect(formatInt(3020)).toBe("3.020");
  });

  it("formatPercent formata fracao como percentual inteiro", () => {
    expect(formatPercent(1)).toBe("100%");
  });
});
