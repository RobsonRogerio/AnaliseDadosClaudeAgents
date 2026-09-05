"""Sidebar de filtros compartilhada entre as páginas.

Usa chaves fixas de widget (st.session_state) para que as duas páginas do
app (Filtros & Drilldown, Correlações & Outliers) mantenham a mesma seleção
ao trocar de página — páginas nativas do Streamlit não compartilham widgets
automaticamente, só o session_state por trás deles.
"""
from dataclasses import dataclass
from datetime import date

import streamlit as st

# Janela real de dados em `vendas` (2025-12-13 a 2026-01-11), ver docs/README.md.
DATA_MIN = date(2025, 12, 13)
DATA_MAX = date(2026, 1, 11)

SEM_CATEGORIA = "Sem categoria"


@dataclass(frozen=True)
class Filters:
    date_start: date
    date_end: date
    canal: tuple[str, ...]  # () = todos
    categorias: tuple[str, ...]  # () = todas
    estados: tuple[str, ...]  # () = todos


def render_sidebar(categorias: list[str], estados: list[str]) -> Filters:
    st.sidebar.header("Filtros")

    date_range = st.sidebar.date_input(
        "Período",
        value=(DATA_MIN, DATA_MAX),
        min_value=DATA_MIN,
        max_value=DATA_MAX,
        key="flt_date_range",
    )
    if isinstance(date_range, tuple) and len(date_range) == 2:
        date_start, date_end = date_range
    else:
        date_start, date_end = DATA_MIN, DATA_MAX

    canal = st.sidebar.multiselect(
        "Canal",
        options=["ecommerce", "loja_fisica"],
        default=[],
        key="flt_canal",
        help="Vazio = todos os canais",
    )

    categoria_options = sorted(set(categorias) | {SEM_CATEGORIA})
    categoria_sel = st.sidebar.multiselect(
        "Categoria",
        options=categoria_options,
        default=[],
        key="flt_categorias",
        help="Vazio = todas as categorias",
    )

    estado_sel = st.sidebar.multiselect(
        "Estado",
        options=sorted(estados),
        default=[],
        key="flt_estados",
        help="Vazio = todos os estados",
    )

    return Filters(
        date_start=date_start,
        date_end=date_end,
        canal=tuple(canal),
        categorias=tuple(categoria_sel),
        estados=tuple(estado_sel),
    )
