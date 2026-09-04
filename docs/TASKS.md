# Task Board — Dashboard E-commerce

Board compartilhado da equipe. Convenções:
- Cada teammate só edita a **sua própria seção** abaixo (evita conflito de edição concorrente no mesmo arquivo).
- Marque status inline: `[ ]` todo, `[~]` em andamento, `[x]` feito.
- Achados de QA e decisões de documentação vivem em arquivos próprios (`docs/qa-findings.md`, `docs/README.md` / `docs/*.md`), não neste board — o board só rastreia progresso.
- Convenção de arquivos por seção (para ninguém pisar no arquivo de outro) é definida pelo Leader na Fase 1, logo abaixo.

---

## Fase 0 — Verificação (concluída pelo orquestrador)

- [x] MCP Supabase conectado (projeto `jbupxekogrdowjhafkgy`)
- [x] `.env` conferido (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY` preenchidas; `SUPABASE_SERVICE_ROLE_KEY` vazia; `DATABASE_URL` preenchida — uso local apenas, nunca no frontend)
- [x] Schema das 4 tabelas levantado (ver `docs/schema.md` — a criar pelo Leader/Documentador)
- [x] Decisão de stack: **Next.js + React + Tailwind + Recharts**
- [x] Decisão de acesso a dados: **RLS policy de SELECT público (`anon`, `authenticated`) + chave anon no client**. Migration `public_read_policies_dashboard` já aplicada nas 4 tabelas (`clientes`, `produtos`, `vendas`, `preco_competidores`) — todas com policy `public_select` (`for select using (true)`).
- [x] Achado de segurança registrado para o QA: leitura pública liberada por decisão de produto (dashboard interno/portfólio); nenhuma policy de INSERT/UPDATE/DELETE foi criada (permanecem bloqueados por padrão). `service_role`/`DATABASE_URL` NUNCA devem ir para código do frontend ou variáveis `NEXT_PUBLIC_*`.

### Schema (resumo)

| Tabela | Linhas | PK | FK | Colunas |
|---|---|---|---|---|
| `clientes` | 50 | `id_cliente` | — | `nome_cliente`, `estado`, `pais`, `data_cadastro` |
| `produtos` | 215 | `id_produto` | — | `nome_produto`, `categoria`, `marca`, `preco_atual`, `data_criacao` |
| `vendas` | 3020 | `id_venda` | `id_cliente`→clientes, `id_produto`→produtos | `data_venda`, `canal_venda` (`ecommerce`/`loja_fisica`), `quantidade`, `preco_unitario` |
| `preco_competidores` | 728 | `id` | `id_produto`→produtos | `nome_concorrente`, `preco_concorrente`, `data_coleta` |

---

## Fase 1 — Fundação (Teammate: leader)

- [x] Analisar as 4 tabelas e mapear quais dados pertencem a cada domínio (vendas, pricing, clientes)
- [x] Escrever o sistema de design comum abaixo (paleta, tipografia, espaçamento, biblioteca de gráficos)
- [x] Escrever a convenção de arquivos por seção abaixo
- [x] Scaffold do projeto Next.js base (package.json, tailwind, tsconfig, layout raiz, client Supabase em `lib/supabase.ts` usando `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [x] Delegar às especialistas (registrar decisões nesta seção)

### Análise de negócio (mapeamento de domínio)

Consultado via `mcp__supabase__execute_sql` (somente leitura). Achados que orientam os specialists — cada um define seus próprios KPIs na Fase 2:

- **Janela de dados**: `vendas` cobre só ~1 mês (2025-12-13 a 2026-01-11), 3020 linhas, 2155 ecommerce (71%, R$705.486) vs 865 loja física (29%, R$268.591) — a granularidade diária existe mas a série histórica é curta; evitar KPIs que exijam comparação ano-a-ano.
- **`clientes`** (50 linhas, `data_cadastro` 2022–2025, 22 estados, 1 país) → alimenta o domínio **Clientes & Comportamento**: recência/antiguidade de cadastro, distribuição geográfica (estado), cruzado com `vendas.id_cliente` para recorrência/ticket médio por cliente.
- **`produtos`** (215 linhas, 11 categorias, 20 marcas, preço R$31,90–R$1.428,99, média R$211,76) + **`vendas`** (`quantidade`, `preco_unitario`, `canal_venda`) → alimenta **Vendas & Receita**: receita e volume por categoria/marca/canal/tempo. Categoria líder em receita: Moda (R$248k); menor: Esporte (R$25k).
- **`produtos.preco_atual`** + **`preco_competidores`** (728 linhas, 4 concorrentes, coleta concentrada em 2026-01-11 — é um snapshot, não série histórica) → alimenta **Pricing & Margem**: comparação preço próprio vs. concorrência (spread/índice competitivo) por produto/categoria. Sem coluna de custo na base, então "margem" real não é calculável — o specialist de pricing deve tratar como *posicionamento de preço vs. mercado*, não margem contábil.
- `vendas` é a tabela de fato que une os 3 domínios (FK para `clientes` e `produtos`) — specialists de vendas/clientes/pricing todos fazem JOIN nela, cada um agregando por sua dimensão.

### Sistema de design comum

Baseado na skill `dataviz` (paleta de referência validada — CVD-safe, ordem fixa, light/dark selecionados, não flip automático). Ver `references/palette.md` da skill para os checks completos.

- **Paleta categórica** (ordem fixa, não ciclar; até 8 séries em stacks/bars/lines adjacentes, até 3 em scatter/bubble/small-multiples):
  1. azul `#2a78d6` / dark `#3987e5` — 2. laranja `#eb6834` / `#d95926` — 3. água `#1baf7a` / `#199e70` — 4. amarelo `#eda100` / `#c98500` — 5. magenta `#e87ba4` / `#d55181` — 6. verde `#008300` / `#008300` — 7. violeta `#4a3aa7` / `#9085e9` — 8. vermelho `#e34948` / `#e66767`.
- **Sequencial** (magnitude, ex. heatmap): uma hue só, azul, claro→escuro (steps em `dashboard/lib/design-system.ts`).
- **Diverging** (polaridade, ex. delta vs. período anterior): azul ↔ vermelho, meio-termo cinza neutro (`#f0efec` light / `#383835` dark).
- **Status** (fixo, nunca reusar para série): good `#0ca30c`, warning `#fab219`, serious `#ec835a`, critical `#d03b3b` — sempre com ícone + label, nunca só cor.
- **Superfícies/tinta**: surface `#fcfcfb`/`#1a1a19`, page plane `#f9f9f7`/`#0d0d0d`, texto primário `#0b0b0b`/`#ffffff`, secundário `#52514e`/`#c3c2b7`, muted `#898781` (ambos), gridline `#e1e0d9`/`#2c2c2a`, baseline de eixo `#c3c2b7`/`#383835`.
- **Tipografia**: `system-ui, -apple-system, "Segoe UI", sans-serif` em toda a UI, incluindo números hero/KPI. Números tabulares (`font-variant-numeric: tabular-nums`) só em colunas de tabela/eixos que precisam alinhar.
- **Espaçamento**: escala de 4px — 4, 8, 12, 16, 24, 32, 48, 64 (usar via classes Tailwind padrão: `p-1`...`p-16`, não inventar valores fora da escala).
- **Componentes de gráfico Recharts (padrão para as 3 seções)**:
  - Cards de gráfico: `rounded-card` (12px), fundo `bg-surface`, borda `border-border` (hairline), padding `p-6`.
  - Traços finos (2px linhas), marcadores >=8px, cantos arredondados 4px nas pontas de barra ancoradas na baseline, gap de 2px entre segmentos empilhados.
  - Legenda sempre presente para >=2 séries (nenhuma para 1 série — o título já nomeia); rótulo direto seletivo até 4 séries, nunca um número em cada ponto.
  - Tooltip com crosshair em linha/área; tooltip por marca em barra/ponto/célula. Sem eixo duplo (dual-axis) — duas métricas de escala diferente viram dois gráficos ou small multiples.
  - Texto (eixos, legendas, valores) sempre nos tokens de tinta (`ink.primary/secondary/muted`), nunca na cor da série.
- **Onde ficam os tokens**: `dashboard/lib/design-system.ts` (hex para props do Recharts, light/dark) + `dashboard/app/globals.css` (CSS vars para classes Tailwind — `bg-surface`, `text-ink-primary`, `border-border`, `bg-plane`, etc., já mapeadas em `tailwind.config.ts`). Specialists importam de lá, não hardcodam hex novo.
- **Dark mode**: selecionado via `prefers-color-scheme` OU `data-theme="dark"` no root (não é flip automático) — já configurado em `globals.css`/`tailwind.config.ts`; specialists não precisam reimplementar, só usar as classes/tokens.

### Convenção de arquivos por seção

Projeto Next.js (App Router) em `dashboard/`. Cada specialist só cria/edita arquivos dentro da própria pasta — zero sobreposição:

```
dashboard/
  app/
    layout.tsx          # Leader (Fase 1/3) — não editar
    globals.css          # Leader (Fase 1) — tokens de design, não editar
    page.tsx             # Leader (Fase 3, integração) — placeholder por enquanto, não editar antes disso
  components/
    sections/
      vendas/             # exclusivo do specialist de vendas
        VendasSection.tsx  # componente raiz da seção — export default, é o que o Leader importa na Fase 3
        *.tsx               # subcomponentes/gráficos da seção (livre nomear)
      pricing/            # exclusivo do specialist de pricing
        PricingSection.tsx # idem, export default
        *.tsx
      clientes/           # exclusivo do specialist de clientes
        ClientesSection.tsx # idem, export default
        *.tsx
  lib/
    supabase.ts          # Leader (Fase 1) — client compartilhado, importar, não recriar
    design-system.ts     # Leader (Fase 1) — tokens de cor/espaçamento p/ Recharts, importar, não recriar
  package.json / tailwind.config.ts / tsconfig.json / next.config.mjs / .env.local  # Leader, não editar (specialist pede ao Leader se precisar de nova dependência)
```

Regras:
- Cada specialist só faz `SELECT` nas tabelas via o client de `lib/supabase.ts` (import `{ supabase } from "@/lib/supabase"`) — nunca cria outro client.
- Componente raiz de cada seção é sempre `export default function <Nome>Section()`, sem props obrigatórias (o Leader importa e renderiza `<VendasSection />` etc. na Fase 3, sem precisar saber o que tem dentro).
- Nada de editar `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `lib/supabase.ts`, `lib/design-system.ts` ou os arquivos de config na raiz do `dashboard/` — esses são do Leader. Se faltar um token de design ou precisar de um pacote npm novo, pedir ao Leader via mensagem em vez de editar direto.
- QA só lê código (nenhuma seção acima é dele) — achados vão para `docs/qa-findings.md`.
- Documentador só escreve em `docs/README.md` (+ auxiliares) — não toca em `dashboard/`.

### Scaffold — status

- Projeto Next.js 14 (App Router) + TypeScript + Tailwind + Recharts + `@supabase/supabase-js` criado em `dashboard/`.
- `npm install` rodado com sucesso (150 pacotes, sem erros de instalação).
- **Nota de segurança para QA**: `next@14.2.35` (última patch da 14.x) ainda tem 2 advisories HIGH em aberto (`npm audit`), todas relacionadas a Server Actions, Middleware, i18n routing, custom servers e WebSocket upgrades — nenhum desses recursos é usado neste dashboard (sem middleware, sem server actions, sem i18n, servidor padrão do `next start`/Vercel). O fix completo exige Next 16 (major breaking change, fora da decisão de stack combinada); registrar como risco aceito e reavaliar se o projeto passar a usar Server Actions/Middleware.
- `dashboard/.env.local` criado (copiado de `SUPABASE_URL`/`SUPABASE_ANON_KEY` do `.env` raiz) e coberto por `dashboard/.gitignore` + `.gitignore` raiz (`.env.local` adicionado).
- **Test runner (a pedido do QA)**: adicionado `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` + `@vitejs/plugin-react` em `devDependencies`, script `"test": "vitest run"`, config em `dashboard/vitest.config.ts` (ambiente `jsdom`, alias `@/*`, `include: __tests__/**/*.test.{ts,tsx}`) + `dashboard/vitest.setup.ts` (matchers do jest-dom). Pastas `dashboard/__tests__/<vendas|pricing|clientes>/` já criadas para o QA. Validado com teste fumaça (`npm test` passou, depois removido). Nota: `vitest` inicialmente puxou uma cadeia `vite`/`esbuild` com CVE crítica (GHSA-5xrq-8626-4rwp, leitura/execução arbitrária de arquivo via UI server) — fixado subindo para `vitest ^3.2.6`; `npm audit` agora só mostra os 2 highs do Next.js já registrados acima (risco aceito).
- **Polyfills de teste (a pedido do QA)**: `dashboard/vitest.setup.ts` agora também define `window.matchMedia` e `window.ResizeObserver`/`global.ResizeObserver` (jsdom não implementa nenhum dos dois) — necessário porque Recharts `ResponsiveContainer` usa `ResizeObserver` e `useThemeMode` usa `matchMedia`. Validado: suíte de Vendas (19 testes) passa 100% após o polyfill.
- **ESLint (achado P3 do QA)**: adicionado `dashboard/.eslintrc.json` (`{"extends": "next/core-web-vitals"}`) + devDependencies `eslint` e `eslint-config-next` (pinado em `14.2.35`, mesma versão do `next`), fechando o gap que fazia `next lint` pedir setup interativo. `eslint-config-next@14.2.35` trouxe `glob@10.3.10` transitivo com CVE alta (GHSA-5j98-mcp5-4vw2, command injection na CLI do glob — não usada aqui, mas corrigido mesmo assim); resolvido com `"overrides": {"glob": "^10.5.0"}` no `package.json`, sem precisar subir para Next 16. `npm run lint` validado rodando limpo e não-interativo (`No ESLint warnings or errors`); `npm audit` voltou a mostrar só os 2 highs do Next.js já aceitos como risco.

---

## Fase 2 — Seções

### Vendas & Receita (Teammate: vendas)
- [x] KPIs definidos (fórmula + fonte de dados)
- [x] Painel construído
- [x] Storytelling da seção

Arquivos: `dashboard/components/sections/vendas/` (`VendasSection.tsx` root +
`KpiHero`, `RevenueTrendChart`, `ChannelMixChart`, `CategoryRevenueChart`,
`TopProductsList`, `InsightCallout`, `ChartCard`, `useThemeMode`, `types.ts`,
`utils.ts`). Dados via `supabase.from("vendas").select(...)` com embed de
`produtos(categoria, nome_produto, marca)` (FK `vendas.id_produto` →
`produtos.id_produto`); agregação feita client-side em `utils.ts`
(`summarizeVendas`), validada previamente com `mcp__supabase__execute_sql`.
Busca pagina via `fetchAllVendas` (`.range()` em loop de 1000 em 1000) —
`vendas` tem 3020 linhas e o PostgREST corta em 1000 por padrão (achado do
Leader/QA, corrigido). Erro tratado com `extractErrorMessage` (mesmo padrão
de `clientes/utils.ts`) para extrair `.message` de erros não-`Error`
(`PostgrestError`). 20 vendas (~R$4.240,01) têm `id_produto` órfão — dado
sintético inválido, FK criada `NOT VALID` pelo Leader — e caem no bucket
"Sem categoria"/"Produto desconhecido" em `porCategoria`/`topProdutos`
(tratamento defensivo já existia em `summarizeVendas`); os KPIs de receita
total/canal não são afetados pois não dependem do join com `produtos`.

**KPIs (fórmula + fonte — tabela `vendas`, join `produtos` quando indicado):**

| KPI | Fórmula | Fonte | Valor no período |
|---|---|---|---|
| Receita total | Σ (`quantidade` × `preco_unitario`) | `vendas` | R$ 974.077,28 |
| Ticket médio | Receita total ÷ nº de vendas | `vendas` | R$ 322,54 (3.020 vendas) |
| Unidades vendidas | Σ `quantidade` | `vendas` | 4.322 un. |
| Receita por canal | Σ (`quantidade` × `preco_unitario`) agrupado por `canal_venda` | `vendas` | ecommerce R$705.486,21 (71%) vs. loja física R$268.591,07 (29%) |
| Ticket médio por canal | Receita do canal ÷ nº de vendas do canal | `vendas` | ecommerce R$327,37 vs. loja física R$310,51 |
| Receita por categoria | Σ (`quantidade` × `preco_unitario`) agrupado por `produtos.categoria` (join `id_produto`) | `vendas` + `produtos` | líder Moda R$248.124,15; menor Esporte R$24.711,59 |
| Tendência semanal de receita | Σ (`quantidade` × `preco_unitario`) agrupado por semana ISO (`data_venda`) e `canal_venda` | `vendas` | 5 semanas, 08/12/2025–11/01/2026, receita estável (~R$210k–238k/semana após a semana parcial inicial) |
| Top produtos por receita | Σ (`quantidade` × `preco_unitario`) agrupado por `produtos.nome_produto`, top 5 | `vendas` + `produtos` | líder: Fone de Ouvido Esportivo (R$116.462,65) |

Nota: janela de dados é só ~1 mês (13/dez/2025–11/jan/2026), por isso nenhum
KPI de comparação ano-a-ano/mês-a-mês foi criado — a tendência usa granularidade
semanal (5 pontos) em vez de mensal.

### Pricing & Margem (Teammate: pricing)
- [x] KPIs definidos (fórmula + fonte de dados)
- [x] Painel construído
- [x] Storytelling da seção

Renomeada na UI para **"Pricing & Posicionamento Competitivo"** — a base não tem coluna de
custo em nenhuma tabela, então não existe "margem" contábil calculável; a seção mede
posicionamento de preço próprio vs. concorrência (snapshot único de `preco_competidores`,
coletado em 2026-01-11, não série histórica).

**Índice de competitividade** (métrica-base de tudo abaixo):
`indice = produtos.preco_atual / média(preco_competidores.preco_concorrente)`, agrupado por
`id_produto` (join `produtos` + `preco_competidores`). `indice > 1` = mais caro que a média dos
concorrentes; `indice < 1` = mais barato. Os 215 produtos têm cobertura de concorrente (média de
3,4 concorrentes/produto, 4 concorrentes distintos).

KPIs (arquivo: `components/sections/pricing/PricingKpiCards.tsx`):
- **% produtos acima do mercado** = `count(indice > 1) / total`. Fonte: agregação do índice acima.
- **Índice de competitividade médio** = média simples do índice em todos os produtos. Fonte: idem.
- **Em risco de preço** = contagem de produtos na banda `muito_acima` (índice > 1,15x). Fonte: idem.
- **Oportunidade de preço** = contagem de produtos na banda `muito_abaixo` (índice < 0,95x). Fonte: idem.

Bandas de posicionamento (`usePricingData.ts`, função `bandOf`): muito abaixo (<0,95x), abaixo
(0,95–1,00x), alinhado (1,00–1,05x), acima (1,05–1,15x), muito acima (>1,15x) — visualizadas em
`PricingBandChart.tsx` (barra 100% empilhada) e usadas nos cortes acionáveis.

Painel (`PricingSection.tsx` + subcomponentes):
- `PricingKpiCards.tsx` — 4 cards acima.
- `PricingBandChart.tsx` — distribuição dos 215 produtos pelas 5 bandas (headline visual da seção).
- `PricingCategoryChart.tsx` — índice médio por categoria (barras horizontais, referência em 1,00x,
  cor azul/vermelho conforme abaixo/acima do mercado). Achado: categoria **Tênis** tem índice médio
  exatamente 2,00x em todos os 15 produtos — outlier isolado da base, destacado como maior risco de
  categoria (vale confirmar com o time de dados se é um padrão real de precificação ou artefato de
  geração dos dados).
- `PricingOutlierTable.tsx` — recorte acionável: top 8 produtos em maior risco de preço (índice mais
  alto) e top 8 em maior oportunidade (índice mais baixo), com preço próprio, média da concorrência
  e índice.

Storytelling: headline (% acima do mercado + índice médio) → decomposição por categoria (destaca
Tênis como outlier) → distribuição por banda → recorte acionável de produtos fora de posição.

### Clientes & Comportamento (Teammate: clientes)
- [x] KPIs definidos (fórmula + fonte de dados)
- [x] Painel construído
- [x] Storytelling da seção

**Arquivos**: `dashboard/components/sections/clientes/` (`ClientesSection.tsx` raiz + `KpiRow`, `GeoDistributionChart`, `CadastroCohortChart`, `ChannelProfileChart`, `TopClientesTable`, `ChartCard`, `useThemeMode`, `types.ts`, `utils.ts`). Dados buscados client-side via `supabase.from("clientes"|"vendas").select(...)` (com paginação `range()` para contornar o limite de 1000 linhas do PostgREST em `vendas`, 3020 linhas) e agregados em `utils.ts` (`summarizeClientes`). `npx tsc --noEmit` sem erros.

**Nota de privacidade aplicada**: `nome_cliente` nunca é lido nem exibido. "Top clientes" usa apenas rank + estado + id mascarado (últimos 4 caracteres, ex. `•••3e2a`).

**KPIs (fórmula + fonte — tabelas `clientes` + `vendas`, join por `id_cliente`)**:
- **Clientes ativos na janela** = `count(distinct vendas.id_cliente) / count(clientes.id_cliente)`. Achado: 50/50 (100% da base cadastrada comprou no período 2025-12-13–2026-01-11).
- **Receita média por cliente** = `Σ(quantidade × preco_unitario) / count(clientes ativos)`. R$ 19.481,56 (mediana R$ 19.104,78, p25 R$ 16.856,28, p75 R$ 21.417,57, min R$ 9.665,29, max R$ 30.716,63).
- **Ticket médio por pedido** = `Σ(quantidade × preco_unitario) / count(id_venda)`. R$ 322,54 (uma linha de `vendas` = um pedido de um produto).
- **Pedidos médios por cliente** = `count(id_venda) / count(clientes ativos)`. 60,4 pedidos/cliente no período (~1 mês).

**Recortes do painel**:
- **Distribuição geográfica**: nº de clientes por `estado` (top 8 + "Outros") — base concentrada mas espalhada (22 estados, máx. 4 clientes/estado: PA, TO, AM).
- **Antiguidade de cadastro**: nº de clientes e receita média por cliente, agrupados por ano de `data_cadastro` (2022–2025, dois gráficos lado a lado — mesma dimensão, escalas diferentes, sem eixo duplo). Achado: sem tendência forte de receita por antiguidade (2022: R$18,1k; 2023: R$19,5k; 2024: R$20,6k; 2025: R$19,0k) — cliente novo gasta tanto quanto cliente antigo nesta janela.
- **Perfil de canal**: segmentação comportamental pela % da receita do cliente feita via e-commerce (`>=70%` predominante e-commerce, `30–70%` misto, `<=30%` predominante loja física), agregando `vendas.canal_venda` por `id_cliente`. Achado: 28 clientes predominante e-commerce, 22 mistos, **nenhum** cliente é predominante loja física — mesmo quem compra na loja física também compra bastante online.
- **Clientes de maior valor**: top 8 por receita total no período (rank + estado + id mascarado + pedidos + receita), recorte acionável para ações de retenção/CRM sem expor identidade.

---

## QA / Arquitetura (Teammate: qa) — contínuo, somente leitura de código

- [x] Auditoria Fase 0/1 (credenciais no `.env`, RLS, chaves)
- [x] Revisão + testes: Vendas
- [x] Revisão + testes: Pricing
- [x] Revisão + testes: Clientes
- [x] Consistência arquitetural entre as 3 seções

Achados vão em `docs/qa-findings.md` (arquivo de propriedade exclusiva do QA). QA não edita código de outros — devolve a correção ao especialista dono do arquivo via mensagem + entrada no findings.

---

## Documentação (Teammate: docs) — contínuo

- [ ] Decisões Fase 0/1
- [ ] KPIs e fórmulas por seção
- [ ] Instruções de setup
- [ ] Achados do QA (resumo)

Mantido em `docs/README.md` (+ arquivos auxiliares em `docs/`), de propriedade exclusiva do Documentador.

---

## Fase 3 — Integração (Teammate: leader)

- [x] Três seções reunidas em dashboard único e coeso
- [x] Achados do QA resolvidos (críticos/bloqueantes — ver decisão sobre polimento abaixo)
- [ ] Documentação completa (docs fará a passada final)

### Integração

- `dashboard/app/page.tsx` reescrito: importa `VendasSection`, `PricingSection`, `ClientesSection` (todas `export default`, sem props) e renderiza na ordem **Vendas → Pricing → Clientes**, seguindo o funil de negócio (receita → preço → cliente). Divisores `border-t border-border` entre seções, cabeçalho de página com título + subtítulo.
- Validação: `npx tsc --noEmit` limpo, `npm test` 60/60 passando, `npm run build` (produção) compilou e gerou `/` como página estática sem erros/warnings. Servidor de produção (`npm run start`) testado via `curl` — as 3 seções aparecem na ordem certa no HTML, cada uma no seu estado inicial de loading esperado (Vendas/Pricing mostram texto "Carregando…", Clientes mostra skeleton animado) antes da hidratação buscar os dados reais no Supabase. Verificação visual em navegador real não foi possível nesta sessão (extensão Chrome do MCP não conectou) — o restante do fluxo (dados reais renderizados, gráficos Recharts) já está coberto pelos testes de QA com mock do Supabase.
- `.eslintrc.json`/gap de lint (achado P3): já resolvido antes da Fase 3 (ver "Scaffold — status" acima) — `npm run lint` roda limpo e não-interativo.

### Decisão sobre achados de polimento do QA (X1, X2, X3, C2)

Optei por **não mexer agora** nos 4 achados de baixa prioridade que exigiriam editar arquivos de dentro das pastas dos specialists (`vendas/`, `pricing/`, `clientes/`) — todos já têm testes passando amarrados ao comportamento atual, e nenhum é bug (nenhum bloqueia a Fase 3, conforme o próprio QA registrou). Risco de introduzir regressão de última hora numa refatoração cosmética não compensa o ganho, e fere a convenção de ownership por pasta combinada na Fase 1. Registrando como **débito técnico conhecido** para uma iteração futura:

- **X1** — padronizar loading/error state (3 padrões diferentes hoje: union discriminada em vendas, hook com booleans em pricing, `summary|null` em clientes). Se for endereçado, extrair um hook `useAsyncData` genérico é o caminho natural — cabe em `lib/`.
- **X2** — extrair `ChartCard.tsx` em `pricing/` (hoje duplica o wrapper inline em 4 arquivos); vendas/clientes já têm o componente.
- **X3** — consolidar `formatBRL`/`formatInt`/`formatPercent` (hoje reimplementados quase identicamente em `vendas/utils.ts` e `clientes/utils.ts`, com variantes menores em `pricing`) num `lib/format.ts` compartilhado.
- **C2** — em `clientes/` (`GeoDistributionChart.tsx`, `ChannelProfileChart.tsx`, `CadastroCohortChart.tsx`), trocar a string literal `"var(--surface-1)"` no `Tooltip.contentStyle.background` pelo token `chartSurface[mode]` de `lib/design-system.ts`, igual vendas/pricing já fazem.

**P2** (índice de competitividade artificial de 2,00x em "Tênis", achado de qualidade de dado) não é código — repassado ao Documentador para virar caveat explícito no README, conforme já sinalizado pelo QA.
