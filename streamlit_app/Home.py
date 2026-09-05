"""Entry point do app Streamlit — health-check dos dados.

Rodar com: streamlit run streamlit_app/Home.py
"""
import pandas as pd
import streamlit as st

from queries import table_row_counts
from theme import register_template

st.set_page_config(
    page_title="Análise Exploratória — E-commerce",
    page_icon="📊",
    layout="wide",
)
register_template()

st.title("📊 Análise Exploratória — E-commerce")

st.markdown(
    """
Este é um **painel complementar** ao dashboard de negócio (Next.js) do projeto.
Enquanto aquele mostra KPIs fixos em 3 seções (Vendas, Pricing, Clientes), este
app é uma ferramenta de **exploração livre**: filtros + drill-down linha-a-linha
e visões estatísticas (distribuições, correlações, outliers) que o dashboard de
negócio não oferece.

Use o menu à esquerda para navegar entre as páginas:
- **Filtros & Drilldown** — filtre por período/canal/categoria/estado e explore
  os dados linha a linha, com exportação em CSV.
- **Correlações & Outliers** — distribuições, correlação entre variáveis e
  detecção de outliers no índice de competitividade e nas vendas.
"""
)

st.subheader("Saúde dos dados")

try:
    counts = table_row_counts()
except Exception as exc:  # noqa: BLE001 — mostrado na UI, não é para silenciar
    st.error(f"Não foi possível consultar o banco: {exc}")
    st.stop()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Clientes", int(counts["clientes"]))
col2.metric("Produtos", int(counts["produtos"]))
col3.metric("Vendas", int(counts["vendas"]))
col4.metric("Preços de concorrentes", int(counts["preco_competidores"]))

col5, col6 = st.columns(2)
col5.metric("Vendas com produto órfão", int(counts["vendas_orfas"]))
data_min = pd.Timestamp(counts["data_min"]).date() if counts["data_min"] else None
data_max = pd.Timestamp(counts["data_max"]).date() if counts["data_max"] else None
col6.metric("Janela de dados", f"{data_min} → {data_max}" if data_min else "—")

st.caption(
    "Valores esperados (ver docs/README.md): clientes=50, produtos=215, "
    "vendas=3020, preco_competidores=728, vendas_orfas≈20, "
    "janela 2025-12-13 → 2026-01-11. Um desvio aqui indica que a base foi "
    "resseedada ou alterada desde a última auditoria documentada."
)
