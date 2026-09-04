import type {
  CategorySummary,
  ChannelSummary,
  ProductSummary,
  VendaRow,
  VendasSummary,
  WeekPoint,
} from "./types";

export const CHANNEL_LABEL: Record<VendaRow["canal_venda"], string> = {
  ecommerce: "E-commerce",
  loja_fisica: "Loja física",
};

/** Início (segunda-feira, UTC) da semana ISO em que `date` cai. */
function weekStartUTC(date: Date): Date {
  const day = date.getUTCDay(); // 0 (dom) .. 6 (sáb)
  const diffFromMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() - diffFromMonday);
  return start;
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

export function summarizeVendas(rows: VendaRow[]): VendasSummary {
  let receitaTotal = 0;
  let unidadesTotal = 0;

  const canalMap = new Map<
    string,
    { receita: number; unidades: number; nVendas: number }
  >();
  const categoriaMap = new Map<
    string,
    { receita: number; unidades: number; nVendas: number }
  >();
  const semanaMap = new Map<
    string,
    { ecommerce: number; loja_fisica: number }
  >();
  const produtoMap = new Map<
    string,
    { categoria: string; marca: string; receita: number; unidades: number }
  >();

  let dataMin = "";
  let dataMax = "";

  for (const row of rows) {
    const receitaLinha = row.quantidade * row.preco_unitario;
    receitaTotal += receitaLinha;
    unidadesTotal += row.quantidade;

    if (!dataMin || row.data_venda < dataMin) dataMin = row.data_venda;
    if (!dataMax || row.data_venda > dataMax) dataMax = row.data_venda;

    const canalAcc = canalMap.get(row.canal_venda) ?? {
      receita: 0,
      unidades: 0,
      nVendas: 0,
    };
    canalAcc.receita += receitaLinha;
    canalAcc.unidades += row.quantidade;
    canalAcc.nVendas += 1;
    canalMap.set(row.canal_venda, canalAcc);

    const categoria = row.produtos?.categoria ?? "Sem categoria";
    const catAcc = categoriaMap.get(categoria) ?? {
      receita: 0,
      unidades: 0,
      nVendas: 0,
    };
    catAcc.receita += receitaLinha;
    catAcc.unidades += row.quantidade;
    catAcc.nVendas += 1;
    categoriaMap.set(categoria, catAcc);

    const weekKey = weekStartUTC(new Date(row.data_venda))
      .toISOString()
      .slice(0, 10);
    const semanaAcc = semanaMap.get(weekKey) ?? {
      ecommerce: 0,
      loja_fisica: 0,
    };
    semanaAcc[row.canal_venda] += receitaLinha;
    semanaMap.set(weekKey, semanaAcc);

    const nomeProduto = row.produtos?.nome_produto ?? "Produto desconhecido";
    const prodAcc = produtoMap.get(nomeProduto) ?? {
      categoria,
      marca: row.produtos?.marca ?? "—",
      receita: 0,
      unidades: 0,
    };
    prodAcc.receita += receitaLinha;
    prodAcc.unidades += row.quantidade;
    produtoMap.set(nomeProduto, prodAcc);
  }

  const nVendas = rows.length;

  const porCanal: ChannelSummary[] = Array.from(canalMap.entries())
    .map(([canal, acc]) => ({
      canal: canal as VendaRow["canal_venda"],
      label: CHANNEL_LABEL[canal as VendaRow["canal_venda"]],
      receita: acc.receita,
      unidades: acc.unidades,
      nVendas: acc.nVendas,
      ticketMedio: acc.nVendas > 0 ? acc.receita / acc.nVendas : 0,
      share: receitaTotal > 0 ? acc.receita / receitaTotal : 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  const porCategoria: CategorySummary[] = Array.from(categoriaMap.entries())
    .map(([categoria, acc]) => ({
      categoria,
      receita: acc.receita,
      unidades: acc.unidades,
      nVendas: acc.nVendas,
    }))
    .sort((a, b) => b.receita - a.receita);

  const porSemana: WeekPoint[] = Array.from(semanaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semanaInicio, acc]) => ({
      semanaInicio,
      label: formatWeekLabel(new Date(`${semanaInicio}T00:00:00Z`)),
      ecommerce: acc.ecommerce,
      loja_fisica: acc.loja_fisica,
      total: acc.ecommerce + acc.loja_fisica,
    }));

  const topProdutos: ProductSummary[] = Array.from(produtoMap.entries())
    .map(([nomeProduto, acc]) => ({
      nomeProduto,
      categoria: acc.categoria,
      marca: acc.marca,
      receita: acc.receita,
      unidades: acc.unidades,
    }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);

  return {
    receitaTotal,
    unidadesTotal,
    nVendas,
    ticketMedio: nVendas > 0 ? receitaTotal / nVendas : 0,
    porCanal,
    porCategoria,
    porSemana,
    topProdutos,
    periodo: { inicio: dataMin, fim: dataMax },
  };
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

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

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
  return "Erro ao carregar dados de vendas";
}

export function formatDatePt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
