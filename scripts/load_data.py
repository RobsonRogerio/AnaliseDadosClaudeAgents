"""Carrega os CSVs de data/ para as tabelas do Supabase, do zero.

Uso:
    python scripts/load_data.py

Requer DATABASE_URL preenchida no .env (com a senha real do banco).
"""
import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL", "")

TABLES = [
    {
        "name": "clientes",
        "csv": DATA_DIR / "clientes.csv",
        "columns": ["id_cliente", "nome_cliente", "estado", "pais", "data_cadastro"],
    },
    {
        "name": "produtos",
        "csv": DATA_DIR / "produtos.csv",
        "columns": ["id_produto", "nome_produto", "categoria", "marca", "preco_atual", "data_criacao"],
    },
    {
        "name": "vendas",
        "csv": DATA_DIR / "vendas.csv",
        "columns": ["id_venda", "data_venda", "id_cliente", "id_produto", "canal_venda", "quantidade", "preco_unitario"],
    },
    {
        "name": "preco_competidores",
        "csv": DATA_DIR / "preco_competidores.csv",
        "columns": ["id_produto", "nome_concorrente", "preco_concorrente", "data_coleta"],
    },
]


def validate_database_url() -> None:
    if not DATABASE_URL or "[YOUR-PASSWORD]" in DATABASE_URL:
        sys.exit(
            "DATABASE_URL nao esta configurada com uma senha real no .env.\n"
            "Preencha DATABASE_URL (Project Settings > Database > Connection string) e tente novamente."
        )


def truncate_all(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "truncate table public.vendas, public.preco_competidores, "
            "public.clientes, public.produtos restart identity cascade;"
        )
    conn.commit()
    print("Tabelas truncadas: vendas, preco_competidores, clientes, produtos")


def load_table(conn, table: dict) -> None:
    df = pd.read_csv(table["csv"])
    df = df[table["columns"]]
    rows = [tuple(row) for row in df.to_numpy()]

    columns_sql = ", ".join(table["columns"])
    query = f"insert into public.{table['name']} ({columns_sql}) values %s"

    with conn.cursor() as cur:
        execute_values(cur, query, rows, page_size=1000)
    conn.commit()
    print(f"{table['name']}: {len(rows)} linhas inseridas")


def main() -> None:
    validate_database_url()
    conn = psycopg2.connect(DATABASE_URL)
    try:
        truncate_all(conn)
        for table in TABLES:
            load_table(conn, table)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
