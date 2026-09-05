"""Página estatística: distribuições, correlações e detecção de outliers."""
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

import theme
from filters import render_sidebar
from queries import fetch_competitividade, fetch_vendas_enriched, list_categorias, list_estados
from stats import coefficient_of_variation, flag_outliers, iqr_bounds, pearson_r

st.set_page_config(page_title="Correlações & Outliers", page_icon="📈", layout="wide")
theme.register_template()

st.title("📈 Correlações & Outliers")
st.caption(
    "Distribuições, correlações entre variáveis e detecção de outliers — "
    "visões estatísticas que o dashboard de negócio (KPIs fixos) não cobre."
)

categorias = list_categorias()
estados = list_estados()
filters = render_sidebar(categorias, estados)
log_y = st.sidebar.checkbox("Escala log (histograma de receita)", value=False)
k_iqr = st.sidebar.slider("Sensibilidade do outlier (IQR ×k)", 1.0, 3.0, 1.5, 0.1)

df = fetch_vendas_enriched(filters)
if df.empty:
    st.warning("Nenhuma venda encontrada para os filtros selecionados.")
    st.stop()

# --- Distribuição de receita por venda -------------------------------------
st.subheader("Distribuição de receita por venda")
fig_hist = px.histogram(
    df,
    x="receita",
    nbins=40,
    log_y=log_y,
    color_discrete_sequence=[theme.CATEGORICAL[0]],
    labels={"receita": "Receita (R$)"},
)
st.plotly_chart(fig_hist, width="stretch")

st.subheader("Receita por canal (boxplot)")
fig_box = px.box(
    df,
    x="canal_venda",
    y="receita",
    color="canal_venda",
    color_discrete_sequence=theme.CATEGORICAL,
    labels={"canal_venda": "Canal", "receita": "Receita (R$)"},
)
st.plotly_chart(fig_box, width="stretch")

# --- Desconto vs. preço de catálogo -----------------------------------------
st.subheader("Desconto praticado vs. preço de catálogo")
df_desc = df.dropna(subset=["preco_atual"]).copy()
df_desc = df_desc[df_desc["preco_atual"] > 0]
df_desc["desconto"] = 1 - df_desc["preco_unitario"] / df_desc["preco_atual"]

fig_desc = px.histogram(
    df_desc,
    x="desconto",
    nbins=40,
    color_discrete_sequence=[theme.CATEGORICAL[1]],
    labels={"desconto": "Desconto (fração do preço de catálogo)"},
)
st.plotly_chart(fig_desc, width="stretch")

n_acima = int((df_desc["preco_unitario"] > df_desc["preco_atual"]).sum())
st.metric(
    "⚠️ Vendas acima do preço de catálogo",
    f"{n_acima}",
    help="preco_unitario > produtos.preco_atual — possível anomalia de preço.",
)

# --- Correlação entre variáveis numéricas -----------------------------------
st.subheader("Correlação entre variáveis")
df_corr = df.copy()
df_corr["hora_do_dia"] = df_corr["data_venda"].dt.hour
df_corr["dia_da_semana"] = df_corr["data_venda"].dt.dayofweek
corr_cols = ["quantidade", "preco_unitario", "receita", "hora_do_dia", "dia_da_semana"]
corr_matrix = df_corr[corr_cols].corr(method="pearson")

fig_corr = px.imshow(
    corr_matrix,
    zmin=-1,
    zmax=1,
    color_continuous_scale=theme.DIVERGING_COLORSCALE,
    text_auto=".2f",
    labels=dict(color="Correlação"),
)
st.plotly_chart(fig_corr, width="stretch")

st.subheader("Quantidade × Preço unitário")
r = pearson_r(df["quantidade"], df["preco_unitario"])
fig_scatter = px.scatter(
    df,
    x="preco_unitario",
    y="quantidade",
    color="canal_venda",
    opacity=0.5,
    color_discrete_sequence=theme.CATEGORICAL,
    labels={"preco_unitario": "Preço unitário (R$)", "quantidade": "Quantidade", "canal_venda": "Canal"},
)
fig_scatter.add_annotation(
    xref="paper", yref="paper", x=0.01, y=0.99,
    text=f"Pearson r = {r:.3f}", showarrow=False,
    bgcolor=theme.CHART_SURFACE,
)
st.plotly_chart(fig_scatter, width="stretch")

st.subheader("Receita por dia da semana × hora do dia")
dias_pt = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
pivot = (
    df_corr.groupby(["dia_da_semana", "hora_do_dia"])["receita"]
    .sum()
    .unstack(fill_value=0)
    .reindex(index=range(7), fill_value=0)
)
fig_heat = px.imshow(
    pivot,
    color_continuous_scale=theme.SEQUENTIAL_BLUE,
    labels=dict(x="Hora do dia", y="Dia da semana", color="Receita (R$)"),
    y=[dias_pt[i] for i in pivot.index],
)
st.plotly_chart(fig_heat, width="stretch")

# --- Índice de competitividade -----------------------------------------------
st.subheader("Índice de competitividade por categoria")
st.caption(
    "índice = produtos.preco_atual / média(preco_competidores.preco_concorrente) "
    "— mesma fórmula validada em docs/README.md."
)
df_comp = fetch_competitividade()

st.info(
    "A categoria **Tênis** aparece com índice ≈ 2,00x em praticamente todos os "
    "produtos, sem variação — achado **P2** já documentado em "
    "`docs/qa-findings.md`: é um artefato da geração sintética de "
    "`preco_competidores`, não um padrão real de mercado. Não tratar como "
    "novidade nem recalcular como se fosse um insight novo.",
    icon="ℹ️",
)

fig_facet = px.histogram(
    df_comp,
    x="indice_competitividade",
    facet_col="categoria",
    facet_col_wrap=4,
    nbins=20,
    color_discrete_sequence=[theme.CATEGORICAL[0]],
)
fig_facet.update_layout(height=700)
st.plotly_chart(fig_facet, width="stretch")

st.subheader("Outliers de índice de competitividade (IQR)")
low, high = iqr_bounds(df_comp["indice_competitividade"].dropna(), k=k_iqr)
st.caption(f"Limites IQR (k={k_iqr}): abaixo de {low:.2f}x ou acima de {high:.2f}x.")

outliers = flag_outliers(df_comp, "indice_competitividade", k=k_iqr)
outliers_alto = outliers[outliers["indice_competitividade"] > high]
outliers_baixo = outliers[outliers["indice_competitividade"] < low]

col_a, col_b = st.columns(2)
with col_a:
    st.markdown("**Índice muito alto**")
    st.dataframe(
        outliers_alto[["nome_produto", "categoria", "preco_atual", "preco_concorrente_medio", "indice_competitividade"]]
        .sort_values("indice_competitividade", ascending=False),
        width="stretch",
    )
with col_b:
    st.markdown("**Índice muito baixo**")
    st.dataframe(
        outliers_baixo[["nome_produto", "categoria", "preco_atual", "preco_concorrente_medio", "indice_competitividade"]]
        .sort_values("indice_competitividade"),
        width="stretch",
    )

fig_out = px.scatter(
    df_comp,
    x="preco_atual",
    y="indice_competitividade",
    color_discrete_sequence=[theme.INK_MUTED],
    opacity=0.5,
    labels={"preco_atual": "Preço atual (R$)", "indice_competitividade": "Índice de competitividade"},
)
fig_out.add_trace(
    go.Scatter(
        x=outliers_alto["preco_atual"], y=outliers_alto["indice_competitividade"],
        mode="markers", marker=dict(color=theme.STATUS["critical"], size=9),
        name="Muito alto",
    )
)
fig_out.add_trace(
    go.Scatter(
        x=outliers_baixo["preco_atual"], y=outliers_baixo["indice_competitividade"],
        mode="markers", marker=dict(color=theme.STATUS["warning"], size=9),
        name="Muito baixo",
    )
)
st.plotly_chart(fig_out, width="stretch")

st.subheader("Dispersão do preço de concorrentes vs. índice")
df_comp["cv_concorrente"] = df_comp.apply(
    lambda row: coefficient_of_variation(row["preco_concorrente_medio"], row["preco_concorrente_desvio"] or 0),
    axis=1,
)
fig_disp = px.scatter(
    df_comp.dropna(subset=["cv_concorrente"]),
    x="indice_competitividade",
    y="cv_concorrente",
    color="categoria",
    color_discrete_sequence=theme.CATEGORICAL,
    hover_data=["nome_produto"],
    labels={
        "indice_competitividade": "Índice de competitividade",
        "cv_concorrente": "Coef. de variação do preço de concorrentes",
        "categoria": "Categoria",
    },
)
st.plotly_chart(fig_disp, width="stretch")
st.caption(
    "Coeficiente de variação alto = concorrentes discordam bastante do preço "
    "do produto; baixo = concorrentes convergem — dá contexto sobre a "
    "confiabilidade da média usada no índice, algo que o dashboard de "
    "negócio (que só usa a média) não expõe."
)
