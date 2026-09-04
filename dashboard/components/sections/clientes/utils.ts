import type {
  ClienteRow,
  ClientesSummary,
  CohortPoint,
  EstadoPoint,
  PerfilCanal,
  PerfilCanalPoint,
  TopClientePoint,
  VendaRow,
} from "./types";

const TOP_ESTADOS = 8;
const TOP_CLIENTES = 8;

/**
 * KPIs e recortes da seção Clientes & Comportamento.
 * Fonte: `clientes` (50 linhas) + `vendas` (join por id_cliente).
 */
export function summarizeClientes(
  clientes: ClienteRow[],
  vendas: VendaRow[]
): ClientesSummary {
  const porCliente = new Map<
    string,
    {
      receita: number;
      nPedidos: number;
      receitaEcommerce: number;
      dataMin: string;
      dataMax: string;
    }
  >();

  let dataMin = "";
  let dataMax = "";

  for (const v of vendas) {
    const receitaLinha = v.quantidade * v.preco_unitario;
    const acc = porCliente.get(v.id_cliente) ?? {
      receita: 0,
      nPedidos: 0,
      receitaEcommerce: 0,
      dataMin: v.data_venda,
      dataMax: v.data_venda,
    };
    acc.receita += receitaLinha;
    acc.nPedidos += 1;
    if (v.canal_venda === "ecommerce") acc.receitaEcommerce += receitaLinha;
    if (v.data_venda < acc.dataMin) acc.dataMin = v.data_venda;
    if (v.data_venda > acc.dataMax) acc.dataMax = v.data_venda;
    porCliente.set(v.id_cliente, acc);

    if (!dataMin || v.data_venda < dataMin) dataMin = v.data_venda;
    if (!dataMax || v.data_venda > dataMax) dataMax = v.data_venda;
  }

  const totalClientes = clientes.length;
  const clientesAtivos = porCliente.size;

  let receitaTotalAtivos = 0;
  let pedidosTotal = 0;
  for (const acc of porCliente.values()) {
    receitaTotalAtivos += acc.receita;
    pedidosTotal += acc.nPedidos;
  }

  const kpis = {
    totalClientes,
    clientesAtivos,
    shareAtivos: totalClientes > 0 ? clientesAtivos / totalClientes : 0,
    receitaMediaPorCliente:
      clientesAtivos > 0 ? receitaTotalAtivos / clientesAtivos : 0,
    ticketMedioPorPedido:
      pedidosTotal > 0 ? receitaTotalAtivos / pedidosTotal : 0,
    pedidosMediosPorCliente:
      clientesAtivos > 0 ? pedidosTotal / clientesAtivos : 0,
    periodo: { inicio: dataMin, fim: dataMax },
  };

  // Distribuição geográfica: nº de clientes cadastrados por estado (top N + Outros).
  const estadoMap = new Map<string, number>();
  for (const c of clientes) {
    estadoMap.set(c.estado, (estadoMap.get(c.estado) ?? 0) + 1);
  }
  const estadosOrdenados = Array.from(estadoMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  const porEstado: EstadoPoint[] = estadosOrdenados
    .slice(0, TOP_ESTADOS)
    .map(([estado, nClientes]) => ({ estado, nClientes }));
  const restoEstados = estadosOrdenados.slice(TOP_ESTADOS);
  if (restoEstados.length > 0) {
    porEstado.push({
      estado: "Outros",
      nClientes: restoEstados.reduce((sum, [, n]) => sum + n, 0),
    });
  }

  // Cohort de cadastro: nº de clientes e receita média (na janela de vendas) por ano de cadastro.
  const cohortMap = new Map<string, { nClientes: number; receita: number }>();
  for (const c of clientes) {
    const ano = c.data_cadastro.slice(0, 4);
    const acc = cohortMap.get(ano) ?? { nClientes: 0, receita: 0 };
    acc.nClientes += 1;
    acc.receita += porCliente.get(c.id_cliente)?.receita ?? 0;
    cohortMap.set(ano, acc);
  }
  const porCohort: CohortPoint[] = Array.from(cohortMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([anoCadastro, acc]) => ({
      anoCadastro,
      nClientes: acc.nClientes,
      receitaMediaPorCliente: acc.nClientes > 0 ? acc.receita / acc.nClientes : 0,
    }));

  // Perfil de canal: segmentação comportamental pela % de receita via e-commerce.
  const perfilMap = new Map<PerfilCanal, number>();
  for (const acc of porCliente.values()) {
    if (acc.receita <= 0) continue;
    const pctEcommerce = acc.receitaEcommerce / acc.receita;
    const perfil: PerfilCanal =
      pctEcommerce >= 0.7
        ? "Predominante e-commerce"
        : pctEcommerce <= 0.3
          ? "Predominante loja física"
          : "Misto";
    perfilMap.set(perfil, (perfilMap.get(perfil) ?? 0) + 1);
  }
  const ORDEM_PERFIL: PerfilCanal[] = [
    "Predominante e-commerce",
    "Misto",
    "Predominante loja física",
  ];
  const porPerfilCanal: PerfilCanalPoint[] = ORDEM_PERFIL.filter((perfil) =>
    perfilMap.has(perfil)
  ).map((perfil) => ({ perfil, nClientes: perfilMap.get(perfil) ?? 0 }));

  // Top clientes por receita — anonimizado (rank + estado + id mascarado, nunca nome).
  const estadoPorCliente = new Map(clientes.map((c) => [c.id_cliente, c.estado]));
  const topClientes: TopClientePoint[] = Array.from(porCliente.entries())
    .sort(([, a], [, b]) => b.receita - a.receita)
    .slice(0, TOP_CLIENTES)
    .map(([idCliente, acc], index) => ({
      rank: index + 1,
      idMascarado: maskClienteId(idCliente),
      estado: estadoPorCliente.get(idCliente) ?? "—",
      receitaTotal: acc.receita,
      nPedidos: acc.nPedidos,
    }));

  return { kpis, porEstado, porCohort, porPerfilCanal, topClientes };
}

/** Mascara o id do cliente (últimos 4 caracteres) — nunca expor nome_cliente. */
function maskClienteId(idCliente: string): string {
  const tail = idCliente.slice(-4);
  return `•••${tail}`;
}

/**
 * Extrai uma mensagem legível de um erro lançado pelo client Supabase.
 * `PostgrestError` não é `instanceof Error` — só tem `message`/`code`/`details`
 * como propriedades planas — então checar `instanceof Error` sozinho descarta
 * a causa real (RLS, rede, etc.) e sempre cai no texto genérico.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Erro ao carregar dados de clientes";
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBRLPrecise(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

export function formatDecimal1(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDatePt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
