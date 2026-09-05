# Painel exploratório (Streamlit)

Complementa o dashboard de negócio em `dashboard/` (Next.js). Onde aquele
mostra KPIs fixos em 3 seções (Vendas, Pricing, Clientes), este app é uma
ferramenta de **exploração livre**: filtros + drill-down linha a linha, e
visões estatísticas (distribuições, correlações, outliers) que o dashboard
de negócio não oferece.

## Rodar localmente

Da raiz do repositório:

```bash
pip install -r requirements.txt
streamlit run streamlit_app/Home.py
```

Reaproveita `SUPABASE_URL` e `SUPABASE_ANON_KEY` já presentes no `.env` da
raiz (mesmas variáveis que o dashboard Next.js usa) — nenhum arquivo de
segredo separado é necessário.

## Publicar (Streamlit Community Cloud ou similar)

Este app é **seguro para publicar com link aberto**, mesma fronteira de
segurança do dashboard Next.js — ver aviso abaixo. Para publicar:

1. Configure `SUPABASE_URL` e `SUPABASE_ANON_KEY` nos **Secrets** da
   plataforma (nunca via `.env` versionado — o `.env` da raiz é gitignored
   e não é enviado no deploy).
2. Aponte o app para `streamlit_app/Home.py`.

## Páginas

- **Home** — health-check das 4 tabelas (contagens, janela de datas) e o
  aviso de segurança abaixo.
- **Filtros & Drilldown** — filtra `vendas` por período/canal/categoria/estado,
  com tabela navegável linha a linha e exportação em CSV.
- **Correlações & Outliers** — distribuições, matriz de correlação,
  detecção de outliers no índice de competitividade (IQR) e dispersão de
  preço de concorrentes.

## 🔒 Nota de segurança

Este app lê os dados via a chave `anon` do Supabase — a mesma usada pelo
dashboard Next.js, restrita por Row Level Security (só `SELECT` liberado
nas 4 tabelas, sem INSERT/UPDATE/DELETE). Todo o join e agregação
(médias, desvio padrão, correlação) acontece em pandas, no processo do
Streamlit — não há SQL arbitrário nem credencial de superusuário do banco
em nenhum ponto deste app. **Nunca** use `DATABASE_URL` ou
`SUPABASE_SERVICE_ROLE_KEY` aqui — essas ficam reservadas para
`scripts/load_data.py`, que roda só localmente.
