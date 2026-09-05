"""Página de filtros livres e drill-down linha a linha sobre `vendas`."""
import plotly.express as px
import streamlit as st

import theme
from filters import Filters, render_sidebar
from queries import fetch_vendas_enriched, list_categorias, list_estados

st.set_page_config(page_title="Filtros & Drilldown", page_icon="🔎", layout="wide")
theme.register_template()

st.title("🔎 Filtros & Drilldown")
st.caption(
    "Explore `vendas` livremente por período/canal/categoria/estado, com "
    "acesso linha a linha — diferente das agregações fixas do dashboard de negócio."
)

categorias = list_categorias()
estados = list_estados()
filters = render_sidebar(categorias, estados)

df = fetch_vendas_enriched(filters)
df_baseline = fetch_vendas_enriched(
    Filters(
        date_start=filters.date_start,
        date_end=filters.date_end,
        canal=(),
        categorias=(),
        estados=(),
    )
)

if df.empty:
    st.warning("Nenhuma venda encontrada para os filtros selecionados.")
    st.stop()

receita_total = df["receita"].sum()
receita_baseline = df_baseline["receita"].sum()
n_vendas = len(df)
n_vendas_baseline = len(df_baseline)
unidades = df["quantidade"].sum()
ticket_medio = receita_total / n_vendas if n_vendas else 0.0
ticket_medio_baseline = receita_baseline / n_vendas_baseline if n_vendas_baseline else 0.0

c1, c2, c3, c4 = st.columns(4)
c1.metric(
    "Receita total",
    f"R$ {receita_total:,.2f}",
    delta=f"R$ {receita_total - receita_baseline:,.2f} vs. sem filtro" if receita_total != receita_baseline else None,
)
c2.metric(
    "Nº de vendas",
    f"{n_vendas:,}",
    delta=f"{n_vendas - n_vendas_baseline:,} vs. sem filtro" if n_vendas != n_vendas_baseline else None,
)
c3.metric("Unidades vendidas", f"{int(unidades):,}")
c4.metric(
    "Ticket médio",
    f"R$ {ticket_medio:,.2f}",
    delta=f"R$ {ticket_medio - ticket_medio_baseline:,.2f} vs. sem filtro" if abs(ticket_medio - ticket_medio_baseline) > 1e-9 else None,
)

st.subheader("Tendência diária de receita por canal")
daily = (
    df.assign(dia=df["data_venda"].dt.date)
    .groupby(["dia", "canal_venda"], as_index=False)["receita"]
    .sum()
)
fig_trend = px.line(
    daily,
    x="dia",
    y="receita",
    color="canal_venda",
    markers=True,
    color_discrete_sequence=theme.CATEGORICAL,
    labels={"dia": "Dia", "receita": "Receita (R$)", "canal_venda": "Canal"},
)
st.plotly_chart(fig_trend, width="stretch")

st.subheader("Receita por categoria × canal")
cat_canal = df.groupby(["categoria", "canal_venda"], as_index=False)["receita"].sum()
fig_cat = px.bar(
    cat_canal,
    x="receita",
    y="categoria",
    color="canal_venda",
    orientation="h",
    barmode="group",
    color_discrete_sequence=theme.CATEGORICAL,
    labels={"receita": "Receita (R$)", "categoria": "Categoria", "canal_venda": "Canal"},
)
fig_cat.update_layout(yaxis=dict(categoryorder="total ascending"))
st.plotly_chart(fig_cat, width="stretch")

st.subheader("Receita por estado")
por_estado = (
    df.dropna(subset=["estado"])
    .groupby("estado", as_index=False)["receita"]
    .sum()
    .sort_values("receita", ascending=False)
    .head(10)
)
fig_estado = px.bar(
    por_estado,
    x="estado",
    y="receita",
    color_discrete_sequence=[theme.CATEGORICAL[0]],
    labels={"receita": "Receita (R$)", "estado": "Estado"},
)
st.plotly_chart(fig_estado, width="stretch")

st.subheader("Dados linha a linha")
n_orfas = int((df["categoria"] == "Sem categoria").sum())
if n_orfas:
    st.caption(
        f"{n_orfas} venda(s) na seleção têm `id_produto` órfão (dado sintético "
        "inválido) e aparecem como \"Sem categoria\" / \"Produto desconhecido\", "
        "mesmo tratamento usado no dashboard Next.js."
    )

st.dataframe(
    df[
        [
            "data_venda",
            "canal_venda",
            "categoria",
            "nome_produto",
            "estado",
            "quantidade",
            "preco_unitario",
            "receita",
        ]
    ],
    width="stretch",
    height=400,
)

st.download_button(
    "⬇️ Baixar seleção filtrada (CSV)",
    data=df.to_csv(index=False).encode("utf-8"),
    file_name="vendas_filtradas.csv",
    mime="text/csv",
)
