"""Funções de dado — buscam as tabelas brutas via anon/PostgREST (db.py) e
fazem join + agregação em pandas, mesmo padrão de dashboard/*/utils.ts
(que também agrega no cliente por trás da chave anon restrita por RLS).
"""
import pandas as pd

from db import fetch_table
from filters import Filters, SEM_CATEGORIA


def _load_vendas() -> pd.DataFrame:
    df = fetch_table(
        "vendas",
        "id_venda,data_venda,id_cliente,id_produto,canal_venda,quantidade,preco_unitario",
        order_by="id_venda",
    )
    df["data_venda"] = pd.to_datetime(df["data_venda"])
    return df


def _load_produtos() -> pd.DataFrame:
    return fetch_table(
        "produtos", "id_produto,nome_produto,categoria,marca,preco_atual", order_by="id_produto"
    )


def _load_clientes() -> pd.DataFrame:
    return fetch_table("clientes", "id_cliente,estado,pais,data_cadastro", order_by="id_cliente")


def _load_preco_competidores() -> pd.DataFrame:
    return fetch_table(
        "preco_competidores", "id_produto,nome_concorrente,preco_concorrente,data_coleta"
    )


def fetch_vendas_enriched(filters: Filters) -> pd.DataFrame:
    """`vendas` LEFT JOIN `produtos`/`clientes`, com o mesmo bucket
    "Sem categoria"/"Produto desconhecido" que dashboard/ usa para as ~20
    vendas com `id_produto` órfão, seguido do filtro de período/canal/
    categoria/estado — tudo em pandas.
    """
    vendas = _load_vendas()
    produtos = _load_produtos()
    clientes = _load_clientes()

    df = vendas.merge(produtos, on="id_produto", how="left")
    df = df.merge(clientes, on="id_cliente", how="left")
    df["categoria"] = df["categoria"].fillna(SEM_CATEGORIA)
    df["nome_produto"] = df["nome_produto"].fillna("Produto desconhecido")
    df["receita"] = df["quantidade"] * df["preco_unitario"]

    dias = df["data_venda"].dt.date
    mask = (dias >= filters.date_start) & (dias <= filters.date_end)
    if filters.canal:
        mask &= df["canal_venda"].isin(filters.canal)
    if filters.categorias:
        mask &= df["categoria"].isin(filters.categorias)
    if filters.estados:
        mask &= df["estado"].isin(filters.estados)

    return df[mask].sort_values("data_venda").reset_index(drop=True)


def fetch_competitividade() -> pd.DataFrame:
    """Reusa a fórmula validada: índice = preco_atual / média(preco_concorrente),
    só para produtos com pelo menos 1 concorrente (merge `how="inner"`, mesmo
    critério do JOIN — não LEFT JOIN — usado quando isto era uma query SQL).
    """
    produtos = _load_produtos()
    precos = _load_preco_competidores()

    agg = (
        precos.groupby("id_produto")["preco_concorrente"]
        .agg(
            preco_concorrente_medio="mean",
            preco_concorrente_desvio="std",  # ddof=1, equivalente a STDDEV_SAMP
            n_concorrentes="count",
        )
        .reset_index()
    )
    df = produtos.merge(agg, on="id_produto", how="inner")
    df["indice_competitividade"] = df["preco_atual"] / df["preco_concorrente_medio"]
    return df


def table_row_counts() -> dict:
    vendas = _load_vendas()
    produtos = _load_produtos()
    clientes = _load_clientes()
    precos = _load_preco_competidores()

    vendas_orfas = int((~vendas["id_produto"].isin(produtos["id_produto"])).sum())

    return {
        "clientes": len(clientes),
        "produtos": len(produtos),
        "vendas": len(vendas),
        "preco_competidores": len(precos),
        "vendas_orfas": vendas_orfas,
        "data_min": vendas["data_venda"].min(),
        "data_max": vendas["data_venda"].max(),
    }


def list_categorias() -> list[str]:
    produtos = _load_produtos()
    return sorted(produtos["categoria"].dropna().unique().tolist())


def list_estados() -> list[str]:
    clientes = _load_clientes()
    return sorted(clientes["estado"].dropna().unique().tolist())
