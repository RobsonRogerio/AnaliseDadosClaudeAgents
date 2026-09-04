"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Índice de competitividade de um produto:
 *   indice = preco_atual / média(preco_concorrente) [agrupado por id_produto]
 * indice > 1  -> produto mais caro que a média dos concorrentes ("acima do mercado")
 * indice < 1  -> produto mais barato que a média dos concorrentes ("abaixo do mercado")
 *
 * Fonte: produtos.preco_atual + preco_competidores.preco_concorrente (snapshot de
 * 2026-01-11, não série histórica). Sem coluna de custo em nenhuma tabela, então
 * isto é posicionamento de preço vs. mercado, não margem contábil.
 */
export type PositionBand =
  | "muito_abaixo"
  | "abaixo"
  | "alinhado"
  | "acima"
  | "muito_acima";

export interface ProdutoPricing {
  id_produto: string;
  nome_produto: string;
  categoria: string;
  marca: string;
  preco_atual: number;
  media_concorrente: number;
  n_concorrentes: number;
  indice: number;
  banda: PositionBand;
}

export interface CategoriaAgregado {
  categoria: string;
  n_produtos: number;
  indice_medio: number;
  acima: number;
  abaixo: number;
}

interface PricingData {
  loading: boolean;
  error: string | null;
  produtos: ProdutoPricing[];
  categorias: CategoriaAgregado[];
}

export function bandOf(indice: number): PositionBand {
  if (indice < 0.95) return "muito_abaixo";
  if (indice < 1.0) return "abaixo";
  if (indice <= 1.05) return "alinhado";
  if (indice <= 1.15) return "acima";
  return "muito_acima";
}

export const bandLabel: Record<PositionBand, string> = {
  muito_abaixo: "Muito abaixo (< 0,95x)",
  abaixo: "Abaixo (0,95x–1,00x)",
  alinhado: "Alinhado (1,00x–1,05x)",
  acima: "Acima (1,05x–1,15x)",
  muito_acima: "Muito acima (> 1,15x)",
};

export interface ProdutoRow {
  id_produto: string;
  nome_produto: string;
  categoria: string;
  marca: string;
  preco_atual: number;
}

export interface CompetidorRow {
  id_produto: string;
  preco_concorrente: number;
}

export interface PricingComputed {
  produtos: ProdutoPricing[];
  categorias: CategoriaAgregado[];
}

/**
 * Agregação pura: junta `produtos` + `preco_competidores` (já buscados do
 * Supabase), calcula o índice de competitividade por produto e a média por
 * categoria. Sem I/O — testável isoladamente sem mockar o client.
 */
export function computePricing(produtosRows: ProdutoRow[], competidoresRows: CompetidorRow[]): PricingComputed {
  const mediaPorProduto = new Map<string, { soma: number; n: number }>();
  for (const row of competidoresRows) {
    const atual = mediaPorProduto.get(row.id_produto) ?? { soma: 0, n: 0 };
    atual.soma += row.preco_concorrente;
    atual.n += 1;
    mediaPorProduto.set(row.id_produto, atual);
  }

  const produtosComIndice: ProdutoPricing[] = [];
  for (const p of produtosRows) {
    const comp = mediaPorProduto.get(p.id_produto);
    if (!comp || comp.n === 0) continue; // sem cobertura de concorrente, fora da análise
    const media_concorrente = comp.soma / comp.n;
    const indice = p.preco_atual / media_concorrente;
    produtosComIndice.push({
      id_produto: p.id_produto,
      nome_produto: p.nome_produto,
      categoria: p.categoria,
      marca: p.marca,
      preco_atual: p.preco_atual,
      media_concorrente,
      n_concorrentes: comp.n,
      indice,
      banda: bandOf(indice),
    });
  }

  const categoriaMap = new Map<string, { soma: number; n: number; acima: number; abaixo: number }>();
  for (const p of produtosComIndice) {
    const atual = categoriaMap.get(p.categoria) ?? { soma: 0, n: 0, acima: 0, abaixo: 0 };
    atual.soma += p.indice;
    atual.n += 1;
    if (p.indice > 1) atual.acima += 1;
    else if (p.indice < 1) atual.abaixo += 1;
    categoriaMap.set(p.categoria, atual);
  }

  const categoriasAgregadas: CategoriaAgregado[] = Array.from(categoriaMap.entries())
    .map(([categoria, v]) => ({
      categoria,
      n_produtos: v.n,
      indice_medio: v.soma / v.n,
      acima: v.acima,
      abaixo: v.abaixo,
    }))
    .sort((a, b) => b.indice_medio - a.indice_medio);

  return { produtos: produtosComIndice, categorias: categoriasAgregadas };
}

export function usePricingData(): PricingData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<ProdutoPricing[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAgregado[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: produtosRows, error: produtosError }, { data: competidoresRows, error: competidoresError }] =
        await Promise.all([
          supabase.from("produtos").select("id_produto, nome_produto, categoria, marca, preco_atual"),
          supabase.from("preco_competidores").select("id_produto, preco_concorrente"),
        ]);

      if (cancelled) return;

      if (produtosError || competidoresError) {
        setError(produtosError?.message ?? competidoresError?.message ?? "Erro ao carregar dados");
        setLoading(false);
        return;
      }

      const { produtos: produtosComIndice, categorias: categoriasAgregadas } = computePricing(
        produtosRows ?? [],
        competidoresRows ?? []
      );

      setProdutos(produtosComIndice);
      setCategorias(categoriasAgregadas);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, error, produtos, categorias };
}
