import { describe, expect, it, vi } from "vitest";

// usePricingData.ts importa lib/supabase.ts no topo do módulo, que lança se as
// env vars NEXT_PUBLIC_SUPABASE_* não estiverem definidas (não estão no ambiente
// de teste). Mockamos para poder importar `bandOf`/`computePricing` sem
// instanciar o client real.
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { bandOf, computePricing } = await import("@/components/sections/pricing/usePricingData");

// Fórmula documentada em docs/TASKS.md — seção "Pricing & Margem":
// muito_abaixo (<0,95x), abaixo (0,95-1,00x), alinhado (1,00-1,05x),
// acima (1,05-1,15x), muito_acima (>1,15x).
describe("bandOf", () => {
  it("classifica < 0.95 como muito_abaixo", () => {
    expect(bandOf(0.8)).toBe("muito_abaixo");
    expect(bandOf(0.949)).toBe("muito_abaixo");
  });

  it("classifica [0.95, 1.00) como abaixo", () => {
    expect(bandOf(0.95)).toBe("abaixo");
    expect(bandOf(0.999)).toBe("abaixo");
  });

  it("classifica [1.00, 1.05] como alinhado", () => {
    expect(bandOf(1.0)).toBe("alinhado");
    expect(bandOf(1.05)).toBe("alinhado");
  });

  it("classifica (1.05, 1.15] como acima", () => {
    expect(bandOf(1.06)).toBe("acima");
    expect(bandOf(1.15)).toBe("acima");
  });

  it("classifica > 1.15 como muito_acima", () => {
    expect(bandOf(1.16)).toBe("muito_acima");
    expect(bandOf(2.0)).toBe("muito_acima");
  });
});

// Fixture: P1 (Moda) indice 1.00 (alinhado), P2 (Esporte) indice 0.8333 (muito_abaixo),
// P3 (Moda) sem cobertura de concorrente -> fora da análise.
const produtosRows = [
  { id_produto: "P1", nome_produto: "Produto 1", categoria: "Moda", marca: "A", preco_atual: 100 },
  { id_produto: "P2", nome_produto: "Produto 2", categoria: "Esporte", marca: "B", preco_atual: 50 },
  { id_produto: "P3", nome_produto: "Produto 3", categoria: "Moda", marca: "C", preco_atual: 30 },
];

const competidoresRows = [
  { id_produto: "P1", preco_concorrente: 80 },
  { id_produto: "P1", preco_concorrente: 120 },
  { id_produto: "P2", preco_concorrente: 60 },
];

describe("computePricing", () => {
  it("calcula media do concorrente e indice por produto", () => {
    const { produtos } = computePricing(produtosRows, competidoresRows);
    const p1 = produtos.find((p) => p.id_produto === "P1");
    const p2 = produtos.find((p) => p.id_produto === "P2");

    expect(p1).toMatchObject({ media_concorrente: 100, n_concorrentes: 2, indice: 1, banda: "alinhado" });
    expect(p2?.indice).toBeCloseTo(50 / 60, 6);
    expect(p2?.banda).toBe("muito_abaixo");
  });

  it("exclui produtos sem cobertura de concorrente (fora da analise)", () => {
    const { produtos } = computePricing(produtosRows, competidoresRows);
    expect(produtos.find((p) => p.id_produto === "P3")).toBeUndefined();
    expect(produtos).toHaveLength(2);
  });

  it("agrega indice medio por categoria, ordenado do maior para o menor", () => {
    const { categorias } = computePricing(produtosRows, competidoresRows);
    // Moda só tem P1 (indice 1.00); Esporte só tem P2 (indice 0.8333)
    expect(categorias[0]).toMatchObject({ categoria: "Moda", n_produtos: 1, indice_medio: 1, acima: 0, abaixo: 0 });
    expect(categorias[1].categoria).toBe("Esporte");
    expect(categorias[1].abaixo).toBe(1);
  });

  it("lida com listas vazias sem dividir por zero", () => {
    const { produtos, categorias } = computePricing([], []);
    expect(produtos).toEqual([]);
    expect(categorias).toEqual([]);
  });
});
