import { describe, expect, it } from "vitest";
import {
  extractErrorMessage,
  formatBRL,
  formatBRLPrecise,
  formatInt,
  formatPercent,
  summarizeVendas,
} from "@/components/sections/vendas/utils";
import type { VendaRow } from "@/components/sections/vendas/types";

// Fixture cobre 2 canais, 2 categorias, 2 produtos e 2 semanas ISO distintas
// (2025-12-15 é segunda-feira; 2025-12-22 é a segunda seguinte).
const rows: VendaRow[] = [
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
  {
    data_venda: "2025-12-22",
    canal_venda: "ecommerce",
    quantidade: 3,
    preco_unitario: 100,
    produtos: { categoria: "Moda", nome_produto: "Camisa", marca: "MarcaA" },
  },
];

describe("summarizeVendas", () => {
  // Fórmulas conforme docs/TASKS.md — seção "Vendas & Receita".
  it("calcula receita total como soma de quantidade x preco_unitario", () => {
    const summary = summarizeVendas(rows);
    expect(summary.receitaTotal).toBe(550); // 2*100 + 1*50 + 3*100
  });

  it("calcula unidades vendidas como soma de quantidade", () => {
    const summary = summarizeVendas(rows);
    expect(summary.unidadesTotal).toBe(6);
  });

  it("calcula ticket medio como receita total / numero de vendas", () => {
    const summary = summarizeVendas(rows);
    expect(summary.nVendas).toBe(3);
    expect(summary.ticketMedio).toBeCloseTo(550 / 3, 6);
  });

  it("agrupa receita e ticket medio por canal, com share sobre a receita total", () => {
    const summary = summarizeVendas(rows);
    const ecommerce = summary.porCanal.find((c) => c.canal === "ecommerce");
    const loja = summary.porCanal.find((c) => c.canal === "loja_fisica");

    expect(ecommerce).toMatchObject({
      receita: 500,
      unidades: 5,
      nVendas: 2,
      ticketMedio: 250,
    });
    expect(ecommerce?.share).toBeCloseTo(500 / 550, 6);

    expect(loja).toMatchObject({
      receita: 50,
      unidades: 1,
      nVendas: 1,
      ticketMedio: 50,
    });
    expect(loja?.share).toBeCloseTo(50 / 550, 6);
  });

  it("agrupa receita por categoria do produto (join produtos)", () => {
    const summary = summarizeVendas(rows);
    const moda = summary.porCategoria.find((c) => c.categoria === "Moda");
    const esporte = summary.porCategoria.find((c) => c.categoria === "Esporte");

    expect(moda).toMatchObject({ receita: 500, unidades: 5, nVendas: 2 });
    expect(esporte).toMatchObject({ receita: 50, unidades: 1, nVendas: 1 });
  });

  it("ordena porCategoria da maior para a menor receita", () => {
    const summary = summarizeVendas(rows);
    expect(summary.porCategoria[0].categoria).toBe("Moda");
    expect(summary.porCategoria.at(-1)?.categoria).toBe("Esporte");
  });

  it("agrupa receita por semana ISO (segunda a domingo) e canal", () => {
    const summary = summarizeVendas(rows);

    expect(summary.porSemana).toHaveLength(2);
    expect(summary.porSemana[0]).toMatchObject({
      semanaInicio: "2025-12-15",
      ecommerce: 200,
      loja_fisica: 50,
      total: 250,
    });
    expect(summary.porSemana[1]).toMatchObject({
      semanaInicio: "2025-12-22",
      ecommerce: 300,
      loja_fisica: 0,
      total: 300,
    });
  });

  it("rankeia top produtos por receita, do maior para o menor", () => {
    const summary = summarizeVendas(rows);
    expect(summary.topProdutos[0]).toMatchObject({
      nomeProduto: "Camisa",
      categoria: "Moda",
      marca: "MarcaA",
      receita: 500,
      unidades: 5,
    });
    expect(summary.topProdutos[1]).toMatchObject({
      nomeProduto: "Bola",
      receita: 50,
    });
  });

  it("limita top produtos a 5 mesmo com mais produtos distintos", () => {
    const manyRows: VendaRow[] = Array.from({ length: 7 }, (_, i) => ({
      data_venda: "2025-12-15",
      canal_venda: "ecommerce" as const,
      quantidade: 1,
      preco_unitario: 10 + i,
      produtos: {
        categoria: "Casa",
        nome_produto: `Produto ${i}`,
        marca: "MarcaX",
      },
    }));

    const summary = summarizeVendas(manyRows);
    expect(summary.topProdutos).toHaveLength(5);
  });

  it("registra o periodo coberto (data minima e maxima)", () => {
    const summary = summarizeVendas(rows);
    expect(summary.periodo).toEqual({ inicio: "2025-12-15", fim: "2025-12-22" });
  });

  it("trata produto null (embed ausente) com fallback de categoria/produto/marca", () => {
    const rowsSemProduto: VendaRow[] = [
      {
        data_venda: "2025-12-15",
        canal_venda: "ecommerce",
        quantidade: 1,
        preco_unitario: 10,
        produtos: null,
      },
    ];

    const summary = summarizeVendas(rowsSemProduto);
    expect(summary.porCategoria[0].categoria).toBe("Sem categoria");
    expect(summary.topProdutos[0].nomeProduto).toBe("Produto desconhecido");
    expect(summary.topProdutos[0].marca).toBe("—");
  });

  it("lida com lista vazia sem dividir por zero", () => {
    const summary = summarizeVendas([]);
    expect(summary.receitaTotal).toBe(0);
    expect(summary.nVendas).toBe(0);
    expect(summary.ticketMedio).toBe(0);
    expect(summary.porCanal).toEqual([]);
    expect(summary.periodo).toEqual({ inicio: "", fim: "" });
  });
});

describe("extractErrorMessage", () => {
  it("extrai .message de uma instancia de Error", () => {
    expect(extractErrorMessage(new Error("falha de rede"))).toBe("falha de rede");
  });

  it("extrai .message de um objeto plano (ex.: PostgrestError, que nao e instanceof Error)", () => {
    expect(extractErrorMessage({ message: "conexão recusada", code: "500" })).toBe(
      "conexão recusada"
    );
  });

  it("usa mensagem generica quando nao ha campo message legivel", () => {
    expect(extractErrorMessage("string qualquer")).toBe("Erro ao carregar dados de vendas");
    expect(extractErrorMessage(null)).toBe("Erro ao carregar dados de vendas");
  });
});

describe("formatters", () => {
  it("formatBRL arredonda para inteiro (sem centavos)", () => {
    expect(formatBRL(974077.28)).toBe("R$ 974.077");
  });

  it("formatBRLPrecise mantem centavos", () => {
    expect(formatBRLPrecise(322.5)).toBe("R$ 322,50");
  });

  it("formatInt formata milhares com separador pt-BR", () => {
    expect(formatInt(4322)).toBe("4.322");
  });

  it("formatPercent formata fracao como percentual inteiro", () => {
    expect(formatPercent(0.71)).toBe("71%");
  });
});
