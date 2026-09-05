# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Three parts:
- `dashboard/` — a Next.js dashboard (the primary product) that reads e-commerce data (sales, competitor pricing, customers) directly from Supabase from the browser, showing 3 fixed business KPI sections (Vendas, Pricing, Clientes). This is where most code work happens.
- `streamlit_app/` — a Python/Streamlit companion app: free-form filtering, row-level drill-down, and statistical views (distributions, correlations, outlier detection) that the KPI-driven Next.js dashboard doesn't provide. Reads via the same RLS-scoped `anon` key as `dashboard/` (never `DATABASE_URL`), aggregating in pandas — safe to deploy publicly, same trust boundary as the Next.js dashboard.
- Repo root — a Python one-off loader (`scripts/load_data.py`) that seeds the 4 Supabase tables from the CSVs in `data/`, plus `docs/` (project knowledge) and `.env` (Supabase credentials, shared by the Python scripts and the Supabase MCP server).

The Next.js dashboard has no backend of its own: React components query Postgres directly via `@supabase/supabase-js` using the public `anon` key, protected only by Postgres Row Level Security (RLS).

## Commands

All dashboard commands run from `dashboard/`:

```bash
cd dashboard
npm install
npm run dev          # http://localhost:3000
npm run build         # production build
npm run lint          # next lint (flat next/core-web-vitals config)
npm test              # vitest run — full suite
npx tsc --noEmit       # type check, no emit
```

Run a single test file or test name with vitest directly:

```bash
npx vitest run __tests__/vendas/utils.test.ts
npx vitest run -t "nome do teste"
```

Test files live under `dashboard/__tests__/<vendas|pricing|clientes>/`, mirroring the section folders in `dashboard/components/sections/`.

Reseeding Supabase from the CSVs in `data/` (destructive — truncates and reloads all 4 tables), from the repo root:

```bash
pip install -r requirements.txt
python scripts/load_data.py   # requires DATABASE_URL in .env
```

Running the Streamlit companion app, from the repo root:

```bash
pip install -r requirements.txt
streamlit run streamlit_app/Home.py   # http://localhost:8501
```

## Architecture

### Data model

Four Supabase/Postgres tables, all with a public-read RLS policy (`public_select`, `for select using (true)`) and no INSERT/UPDATE/DELETE policies (writes are blocked by default):

- `clientes` (50 rows) — `id_cliente` PK; customer registry (name, state, country, signup date).
- `produtos` (215 rows) — `id_produto` PK; catalog (name, category, brand, current price).
- `vendas` (3020 rows) — `id_venda` PK, FKs to `clientes` and `produtos`; the fact table (date, channel `ecommerce`/`loja_fisica`, quantity, unit price actually charged). All 3 dashboard sections join into this table. It exceeds PostgREST's default 1000-row cap, so any full read of `vendas` must paginate with `.range()` in a loop (see `fetchAllVendas` in the vendas section).
- `preco_competidores` (728 rows) — FK to `produtos`; competitor prices, mostly a single snapshot (collected 2026-01-11), not a time series.

Known data quirks that shape KPI design — see `docs/README.md` for the full rationale:
- `vendas` only spans ~1 month, so no section does year-over-year or month-over-month comparisons; weekly granularity is used instead.
- No cost column anywhere, so "margin" isn't computable — the pricing section reports price positioning vs. competitors, not margin.
- ~0.66% of `vendas` rows have an orphaned `id_produto` (synthetic data artifact); sections that join `produtos` bucket these as "unknown category/product" rather than dropping them.

### Frontend structure (`dashboard/`)

- `lib/supabase.ts` — the single Supabase client (anon key), imported everywhere; never instantiate another client.
- `lib/design-system.ts` — the only source of hex color tokens (light/dark pairs) for Recharts props. `app/globals.css` + `tailwind.config.ts` mirror the same colors as CSS vars/Tailwind classes for non-chart UI. Never hardcode a new hex value in a component.
- `app/page.tsx` — composes the three section components in order **Vendas → Pricing → Clientes** (revenue → price → customer funnel). No props are passed; each section is self-contained.
- `components/sections/<vendas|pricing|clientes>/` — one folder per business domain, each with a root `<Nome>Section.tsx` (`export default`, no required props) plus its own chart components, `types.ts`, and `utils.ts`. Each section fetches its own data from Supabase and aggregates it client-side in its `utils.ts` (e.g. `summarizeVendas`, `summarizeClientes`, `computePricing`) — aggregation logic is kept in plain functions specifically so it's unit-testable outside React.
- Sections do not share code with each other beyond `lib/`. Known duplication that hasn't been factored out yet: format helpers (`formatBRL`, `formatInt`, `formatPercent`) are reimplemented per-section, pricing lacks its own `ChartCard.tsx`, and loading/error state shape differs across sections (union type in vendas, boolean flags in pricing, `summary | null` in clientes). This is tracked as known tech debt in `docs/TASKS.md`, not something to silently "fix" as a drive-by.

### Streamlit companion app (`streamlit_app/`)

Multipage app: `Home.py` (entry point, data health-check, security banner) + `pages/1_Filtros_e_Drilldown.py` + `pages/2_Correlacoes_e_Outliers.py`. Native `pages/` was chosen over `st.tabs` deliberately — Streamlit reruns the whole script on every interaction, and `st.tabs` executes both tabs' bodies on every rerun regardless of which is visible, so a `pages/`-based split keeps the (heavier) stats page from recomputing on every drilldown-page filter tweak.

- `db.py` — the client/fetch layer. `get_client()` uses `st.cache_resource` (the Supabase client holds an HTTP connection pool, stateful and not meant to be recreated per call); `fetch_table()` uses `st.cache_data(ttl=300)` since its return value is a plain, comparable `DataFrame` that should expire if the DB gets reseeded by `scripts/load_data.py` while the app keeps running. `fetch_table()` paginates with `.range()` in a loop — the same PostgREST 1000-row cap that forces `dashboard/`'s `fetchAllVendas` to paginate applies here too (only `vendas`, at 3020 rows, actually needs it).
- `theme.py` — a Python port of `dashboard/lib/design-system.ts`'s tokens (categorical palette, sequential/diverging scales, status colors, ink/gridline/font) into a registered Plotly template, so charts here match the Next.js dashboard's palette. Only the light-mode tokens are ported (a deliberate v1 scoping decision, paired with `.streamlit/config.toml` forcing the Streamlit chrome itself to light) — don't treat the missing dark variant as an oversight.
- `queries.py` — fetches raw tables via `db.fetch_table()` and does all joining/aggregation in pandas (merges, `groupby`, `.std()`, correlation), not in SQL — there's no SQL here at all, since PostgREST/anon only exposes `SELECT` on whole tables. `fetch_vendas_enriched` left-merges `produtos`/`clientes` and buckets the same ~20 orphaned-`id_produto` rows as `dashboard/`'s vendas section does ("Sem categoria"/"Produto desconhecido"). `fetch_competitividade` reuses the exact índice formula documented in `docs/README.md` (`preco_atual / mean(preco_concorrente)`), inner-merged so only products with at least one competitor price get an index — same semantics as the equivalent SQL `JOIN` would have.
- `filters.py` / `stats.py` — shared sidebar filter state (via fixed `st.session_state` keys, since Streamlit pages don't share widgets automatically) and pure statistical helpers (IQR outlier bounds, coefficient of variation, Pearson r) kept free of Streamlit/DB imports, mirroring how `dashboard/*/utils.ts` keeps aggregation logic testable.

**Security note:** `streamlit_app/` reads via `SUPABASE_URL`/`SUPABASE_ANON_KEY` — the same RLS-scoped, read-only credential `dashboard/` uses — never `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`. This was a deliberate design choice specifically so the app is safe to deploy publicly (e.g. Streamlit Community Cloud) with the same trust boundary as the Next.js dashboard. If a future change ever needs raw Postgres access (e.g. an ad-hoc SQL feature), that would reintroduce `DATABASE_URL` and the app would need to go back to being a local/internal-only tool, same boundary as `scripts/load_data.py` — don't mix the two models in one deployment.

### Security boundary

`SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` must never appear in `dashboard/` or `streamlit_app/` — not in code, and not in any `NEXT_PUBLIC_*` env var, since Next.js inlines those into the public bundle. Only the `anon` key (public, RLS-scoped) is meant to reach either app's runtime — `NEXT_PUBLIC_SUPABASE_ANON_KEY` for `dashboard/`, `SUPABASE_ANON_KEY` for `streamlit_app/`. The anon key only grants SELECT because of the RLS policy described above — do not add write policies without treating it as a deliberate, discussed security change. `DATABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are reserved for `scripts/load_data.py`, which only ever runs locally.

A known accepted risk: `next@14.2.35` has 2 open HIGH `npm audit` advisories, all tied to Server Actions/Middleware/i18n routing/custom servers/WebSocket upgrades, none of which this project uses. Fixing requires a Next 16 migration; re-evaluate only if the project starts using those features.

### Design system rules (for any new chart/UI)

- Categorical palette is 8 fixed-order colors (blue, orange, aqua, yellow, magenta, green, violet, red) — never reorder or cycle.
- Sequential (magnitude) = single blue hue, light→dark. Diverging (polarity) = blue↔red with neutral gray midpoint.
- Status colors (good/warning/serious/critical) are reserved — never reused as a series color, always paired with an icon + label.
- Never use a dual axis; two differently-scaled metrics become two charts.
- Spacing follows the 4px scale via standard Tailwind classes only.

## Documentation

`docs/README.md` is the authoritative write-up of KPI formulas, data sources, and per-section storytelling — check it before changing a KPI calculation, so the change stays consistent with its documented formula and source table. `docs/qa-findings.md` and `docs/TASKS.md` hold the historical QA audit and task board from this project's original build (via a multi-agent team) and record deliberate, already-decided tradeoffs (e.g. the tech debt listed above) — treat items marked as resolved/accepted there as closed, not open TODOs.
