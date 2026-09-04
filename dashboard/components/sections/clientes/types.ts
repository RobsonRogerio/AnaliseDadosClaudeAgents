// Tipos da seção Clientes & Comportamento.

export type CanalVenda = "ecommerce" | "loja_fisica";

/** Linha bruta de `clientes` (somente colunas usadas pela seção — sem nome_cliente). */
export interface ClienteRow {
  id_cliente: string;
  estado: string;
  data_cadastro: string;
}

/** Linha bruta de `vendas` (somente colunas usadas pela seção). */
export interface VendaRow {
  id_cliente: string;
  data_venda: string;
  canal_venda: CanalVenda;
  quantidade: number;
  preco_unitario: number;
}

export interface ClientesKpis {
  totalClientes: number;
  clientesAtivos: number;
  shareAtivos: number;
  receitaMediaPorCliente: number;
  ticketMedioPorPedido: number;
  pedidosMediosPorCliente: number;
  periodo: { inicio: string; fim: string };
}

export interface EstadoPoint {
  estado: string;
  nClientes: number;
}

export interface CohortPoint {
  anoCadastro: string;
  nClientes: number;
  receitaMediaPorCliente: number;
}

export type PerfilCanal =
  | "Predominante e-commerce"
  | "Misto"
  | "Predominante loja física";

export interface PerfilCanalPoint {
  perfil: PerfilCanal;
  nClientes: number;
}

export interface TopClientePoint {
  rank: number;
  idMascarado: string;
  estado: string;
  receitaTotal: number;
  nPedidos: number;
}

export interface ClientesSummary {
  kpis: ClientesKpis;
  porEstado: EstadoPoint[];
  porCohort: CohortPoint[];
  porPerfilCanal: PerfilCanalPoint[];
  topClientes: TopClientePoint[];
}
