"""Cliente Supabase (chave anon, restrita por RLS) e busca de tabelas.

Mesma fronteira de segurança do dashboard Next.js: só a chave `anon`
(pública, leitura liberada pelas policies `public_select` das 4 tabelas)
é usada aqui — nunca `DATABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. É por isso
que este app pode ser publicado com link aberto, ao contrário de um app
conectado direto no Postgres com credencial de superusuário.
"""
import os
from pathlib import Path

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from supabase import Client, create_client

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

# Cap padrão de linhas por request do PostgREST — usado para paginar `vendas`
# (3020 linhas), mesmo valor/limitação que dashboard/'s fetchAllVendas contorna.
PAGE_SIZE = 1000


def _get_config(key: str) -> str:
    """Lê de os.environ (via .env local) ou st.secrets (deploy no Streamlit Cloud)."""
    value = os.environ.get(key, "")
    if value:
        return value
    try:
        return st.secrets[key]
    except Exception:
        return ""


SUPABASE_URL = _get_config("SUPABASE_URL")
SUPABASE_ANON_KEY = _get_config("SUPABASE_ANON_KEY")


def _validate_config() -> None:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        st.error(
            "SUPABASE_URL / SUPABASE_ANON_KEY não configuradas. Localmente, "
            "preencha o `.env` da raiz do repositório; em deploy (Streamlit "
            "Cloud), configure-as em Secrets."
        )
        st.stop()


@st.cache_resource(show_spinner=False)
def get_client() -> Client:
    """Client Supabase único, reaproveitado entre reruns do Streamlit."""
    _validate_config()
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


@st.cache_data(ttl=300, show_spinner="Consultando Supabase…")
def fetch_table(table: str, columns: str, order_by: str | None = None) -> pd.DataFrame:
    """Busca uma tabela inteira via PostgREST, paginando em blocos de
    `PAGE_SIZE` linhas quando necessário (só relevante hoje para `vendas`).
    """
    client = get_client()
    rows: list[dict] = []
    start = 0
    while True:
        query = client.table(table).select(columns)
        if order_by:
            query = query.order(order_by)
        resp = query.range(start, start + PAGE_SIZE - 1).execute()
        batch = resp.data
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return pd.DataFrame(rows)
