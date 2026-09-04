// Tipos da seção Vendas & Receita.

export type CanalVenda = "ecommerce" | "loja_fisica";

/** Linha bruta retornada pelo client Supabase (join vendas -> produtos). */
export interface VendaRow {
  data_venda: string;
  canal_venda: CanalVenda;
  quantidade: number;
  preco_unitario: number;
  produtos: {
    categoria: string;
    nome_produto: string;
    marca: string;
  } | null;
}

export interface ChannelSummary {
  canal: CanalVenda;
  label: string;
  receita: number;
  unidades: number;
  nVendas: number;
  ticketMedio: number;
  share: number;
}

export interface CategorySummary {
  categoria: string;
  receita: number;
  unidades: number;
  nVendas: number;
}

export interface WeekPoint {
  semanaInicio: string;
  label: string;
  ecommerce: number;
  loja_fisica: number;
  total: number;
}

export interface ProductSummary {
  nomeProduto: string;
  categoria: string;
  marca: string;
  receita: number;
  unidades: number;
}

export interface VendasSummary {
  receitaTotal: number;
  unidadesTotal: number;
  nVendas: number;
  ticketMedio: number;
  porCanal: ChannelSummary[];
  porCategoria: CategorySummary[];
  porSemana: WeekPoint[];
  topProdutos: ProductSummary[];
  periodo: { inicio: string; fim: string };
}
