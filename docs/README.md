# Dashboard E-commerce

Dashboard interno (portfólio) para análise de dados de um e-commerce fictício: vendas, precificação frente à concorrência e comportamento de clientes. Lê os dados diretamente de um projeto Supabase (Postgres) a partir do client no navegador, sem backend próprio.

> Status: projeto concluído (Fases 0–3). `dashboard/app/page.tsx` integra as 3 seções em um único dashboard; `npx tsc --noEmit`, `npm test` (60/60) e `npm run build` (produção) rodam limpos. Ver `docs/TASKS.md` para o histórico completo do board de tarefas da equipe.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** para estilo/layout
- **Recharts** para os gráficos
- **Supabase** (`@supabase/supabase-js`) como fonte de dados — Postgres com Row Level Security (RLS)

## As 4 tabelas de dados

| Tabela | Linhas | Chave | Relaciona com | O que representa |
|---|---|---|---|---|
| `clientes` | 50 | `id_cliente` | — | Cadastro de clientes: nome, estado, país, data de cadastro |
| `produtos` | 215 | `id_produto` | — | Catálogo: nome, categoria, marca, preço atual, data de criação |
| `vendas` | 3020 | `id_venda` | `id_cliente` → clientes, `id_produto` → produtos | Fato de vendas: data, canal (`ecommerce`/`loja_fisica`), quantidade, preço unitário praticado |
| `preco_competidores` | 728 | `id` | `id_produto` → produtos | Preços coletados de 4 concorrentes por produto |

`vendas` é a tabela de fato que une os três domínios do dashboard (Vendas, Pricing, Clientes) — cada seção agrega essa tabela pela sua própria dimensão.

**Particularidades dos dados** que moldaram as decisões de KPI de cada seção:
- `vendas` cobre uma janela curta (~1 mês, 2025-12-13 a 2026-01-11): não há série longa o suficiente para comparações ano-a-ano.
- `preco_competidores` é majoritariamente um **snapshot** (coleta concentrada em 2026-01-11), não uma série histórica de preços.
- Não há coluna de custo em nenhuma tabela — "margem" contábil não é calculável; a seção de Pricing trata a métrica como **posicionamento de preço vs. mercado**, não margem.
- `vendas` não tinha uma foreign key formal para `produtos` (corrigida durante a integração) e há ~20 vendas (~0,66% das 3020 linhas) com `id_produto` órfão — apontam para um produto inexistente e por isso ficam sem categoria/nome de produto no embed usado pela seção de Vendas.

## Arquitetura de dados e segurança

O dashboard não tem backend próprio: os componentes React fazem `SELECT` diretamente no Supabase a partir do navegador, usando um client único (`dashboard/lib/supabase.ts`) autenticado com a **chave `anon`** (pública, feita para o client).

Isso só é seguro porque as 4 tabelas têm uma **RLS policy de SELECT público** (`public_select`, `for select using (true)`, aplicada a `anon` e `authenticated`) e **nenhuma policy de INSERT/UPDATE/DELETE** — essas operações permanecem bloqueadas por padrão pelo RLS do Postgres. Ou seja: qualquer um com a chave anon pode *ler* os dados (decisão de produto para um dashboard interno/portfólio, sem dados sensíveis), mas ninguém consegue escrever através dela.

Regra que vale para todo o projeto: **`SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` nunca devem aparecer no frontend** — nem em código que roda no navegador, nem em variáveis com prefixo `NEXT_PUBLIC_*` (essas são embutidas no bundle público pelo Next.js). Só a URL do projeto e a chave anon (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) são expostas ao client, e isso é intencional.

Risco de segurança aceito e registrado para o QA: `next@14.2.35` (última patch da linha 14.x) tem 2 advisories HIGH em aberto no `npm audit`, todos relacionados a Server Actions, Middleware, i18n routing, custom servers e WebSocket upgrades — nenhum desses recursos é usado neste projeto (sem middleware, sem server actions, sem i18n, deploy padrão `next start`/Vercel). Corrigir exigiria migrar para Next 16 (breaking change fora do escopo combinado); reavaliar se o projeto passar a usar Server Actions ou Middleware.

## Sistema de design

Fonte da verdade: [`dashboard/lib/design-system.ts`](../dashboard/lib/design-system.ts) (tokens de cor para props do Recharts, com par light/dark) + `dashboard/app/globals.css` / `dashboard/tailwind.config.ts` (as mesmas cores como CSS vars/classes Tailwind para o resto da UI). As três seções importam desses arquivos — nenhum componente deve hardcodar hex novo.

Princípios (baseados na skill `dataviz` — paleta validada, CVD-safe):
- **Paleta categórica** de 8 cores em ordem fixa (nunca ciclar/reordenar): azul, laranja, água, amarelo, magenta, verde, violeta, vermelho. Até 8 séries em barras/linhas/stacks adjacentes; até 3 em scatter/bubble/small-multiples.
- **Sequencial** (magnitude, ex. heatmap): uma única hue (azul), claro → escuro.
- **Diverging** (polaridade, ex. delta vs. período anterior): azul ↔ vermelho, com um cinza neutro no meio.
- **Cores de status** (good/warning/serious/critical) são fixas e reservadas — nunca reaproveitadas como cor de série, e sempre acompanhadas de ícone + label (nunca só a cor).
- **Tipografia**: `system-ui` (fonte do sistema) em toda a UI, inclusive números grandes de KPI; números tabulares só em colunas de tabela/eixos que precisam alinhar.
- **Espaçamento**: escala de 4px (4/8/12/16/24/32/48/64px), via classes Tailwind padrão.
- **Padrões de gráfico Recharts**: cards com cantos de 12px e padding generoso; traços de 2px; legenda só a partir de 2 séries; tooltip com crosshair em linha/área; **nunca eixo duplo** (dual-axis) — duas métricas de escala diferente viram dois gráficos.
- **Dark mode**: segue `prefers-color-scheme` do sistema ou `data-theme="dark"` no root; já configurado, as seções só precisam usar os tokens/classes.

## Seções do dashboard

Cada seção é um domínio de negócio com componente raiz próprio em `dashboard/components/sections/<nome>/`. `dashboard/app/page.tsx` renderiza as 3 seções nesta mesma ordem — **Vendas → Pricing → Clientes** —, seguindo o funil de negócio (receita → preço → cliente), separadas por divisores visuais.

### Vendas & Receita

Componente raiz: [`dashboard/components/sections/vendas/VendasSection.tsx`](../dashboard/components/sections/vendas/VendasSection.tsx). Dados vêm de `supabase.from("vendas").select(...)` com embed de `produtos(categoria, nome_produto, marca)` (FK `vendas.id_produto` → `produtos.id_produto`); a agregação é feita client-side em `utils.ts` (`summarizeVendas`), validada previamente contra o banco via `mcp__supabase__execute_sql`.

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

Nota: a janela de dados é curta (~1 mês, 13/dez/2025–11/jan/2026), por isso não há KPI de comparação ano-a-ano/mês-a-mês — a tendência usa granularidade semanal (5 pontos) em vez de mensal.

**A história que o painel conta**, de cima para baixo:
1. **Hero** com os números-chave do período (receita total, ticket médio, unidades vendidas) — o resumo executivo.
2. **Tendência semanal de receita por canal** — mostra que a receita é estável semana a semana (sem sazonalidade forte na janela disponível), com ecommerce consistentemente à frente de loja física.
3. **Mix de canal e top produtos** — aprofunda o "onde": ecommerce domina 71% da receita, e um produto isolado (Fone de Ouvido Esportivo) já responde por uma fatia relevante do topo.
4. **Receita por categoria** — muda o eixo de análise para "o quê": todas as 11 categorias lado a lado.
5. **Insight de concentração (callout)** — fecha a seção nomeando o achado mais acionável: Moda concentra a maior receita (R$248k) enquanto Esporte é a menor (R$25k), um spread de ~10x que sugere revisão de mix/sortimento.

### Pricing & Posicionamento Competitivo

Componente raiz: [`dashboard/components/sections/pricing/PricingSection.tsx`](../dashboard/components/sections/pricing/PricingSection.tsx). Nome exibido na UI é "Pricing & Posicionamento Competitivo" (não "Margem") — a base não tem coluna de custo em nenhuma tabela, então "margem" contábil não é calculável; a seção mede posicionamento de preço próprio vs. concorrência a partir de um **snapshot único** de `preco_competidores` (coleta concentrada em 2026-01-11, não é série histórica).

**Métrica-base**: índice de competitividade = `produtos.preco_atual / média(preco_competidores.preco_concorrente)`, agrupado por `id_produto` (join `produtos` + `preco_competidores`, 215 produtos, média de 3,4 concorrentes/produto). `indice > 1` = mais caro que a média dos concorrentes; `indice < 1` = mais barato.

**Bandas de posicionamento** (sobre o índice): muito abaixo (<0,95x), abaixo (0,95–1,00x), alinhado (1,00–1,05x), acima (1,05–1,15x), muito acima (>1,15x).

**KPIs (fórmula + fonte):**

| KPI | Fórmula | Fonte |
|---|---|---|
| % produtos acima do mercado | `count(indice > 1) / total` | índice de competitividade |
| Índice de competitividade médio | média simples do índice em todos os produtos | índice de competitividade |
| Em risco de preço | contagem de produtos na banda "muito acima" (índice > 1,15x) | índice de competitividade |
| Oportunidade de preço | contagem de produtos na banda "muito abaixo" (índice < 0,95x) | índice de competitividade |

**A história que o painel conta**, de cima para baixo:
1. **Headline** — os 4 KPIs acima (% acima do mercado + índice médio como resumo executivo).
2. **Decomposição por categoria** (índice médio por categoria, barras horizontais com referência em 1,00x) — destaca onde o desalinhamento de preço se concentra.
3. **Distribuição por banda** (barra 100% empilhada dos 215 produtos nas 5 bandas) — a imagem visual central da seção.
4. **Recorte acionável** (tabela) — top 8 produtos em maior risco de preço e top 8 em maior oportunidade, com preço próprio, média da concorrência e índice.

**Caveat de qualidade de dado** (confirmado pelo QA, achado P2 em `docs/qa-findings.md`): a categoria **Tênis** aparece com índice médio de exatamente **2,00x em todos os 15 produtos**, sem nenhuma variação — estatisticamente incompatível com dado real (concorrência nunca bate exatamente 2x em 100% dos produtos de uma categoria). É um **artefato da geração sintética da base `preco_competidores`**, não um padrão de precificação real. O painel destaca Tênis como maior "risco" de categoria — correto tecnicamente, dado o índice calculado —, mas esse número **não deve ser tratado como padrão real de mercado sem validar contra dados de produção**.

### Clientes & Comportamento

Componente raiz: [`dashboard/components/sections/clientes/ClientesSection.tsx`](../dashboard/components/sections/clientes/ClientesSection.tsx). Dados de `clientes` e `vendas` (join por `id_cliente`), com paginação (`range()`) na leitura de `vendas` para contornar o limite de 1000 linhas do PostgREST (a tabela tem 3020 linhas); agregação em `utils.ts` (`summarizeClientes`).

**Nota de privacidade**: `nome_cliente` nunca é lido nem exibido em nenhum ponto da seção. O recorte "Top clientes" identifica cada cliente só por rank + estado + ID mascarado (últimos 4 caracteres, ex. `•••3e2a`) — o suficiente para uma ação de CRM/retenção sem expor identidade.

**KPIs (fórmula + fonte — tabelas `clientes` + `vendas`, join por `id_cliente`):**

| KPI | Fórmula | Fonte | Valor no período |
|---|---|---|---|
| Clientes ativos na janela | `count(distinct vendas.id_cliente) / count(clientes.id_cliente)` | `clientes` + `vendas` | 50/50 (100% da base cadastrada comprou) |
| Receita média por cliente | Σ(`quantidade` × `preco_unitario`) ÷ nº de clientes ativos | `vendas` | R$ 19.481,56 (mediana R$ 19.104,78) |
| Ticket médio por pedido | Σ(`quantidade` × `preco_unitario`) ÷ nº de pedidos (`id_venda`) | `vendas` | R$ 322,54 |
| Pedidos médios por cliente | nº de pedidos ÷ nº de clientes ativos | `vendas` | 60,4 pedidos/cliente (~1 mês) |

**A história que o painel conta**, de cima para baixo:
1. **KPI row** com os 4 números acima — visão executiva de quão ativa e valiosa é a base de clientes na janela disponível.
2. **Distribuição geográfica** — clientes por estado (top 8 + "Outros"): base espalhada em 22 estados, sem concentração forte (máx. 4 clientes/estado).
3. **Antiguidade de cadastro** — nº de clientes e receita média por cliente por ano de cadastro (2022–2025, dois gráficos lado a lado, sem eixo duplo). Achado: não há tendência de receita por antiguidade — cliente novo gasta tanto quanto cliente antigo nesta janela.
4. **Perfil de canal** — segmentação pela % da receita de cada cliente feita via e-commerce (predominante e-commerce ≥70%, misto 30–70%, predominante loja física ≤30%). **Achado de destaque**: 28 clientes são predominante e-commerce, 22 são mistos, e **nenhum cliente é predominante loja física** — até quem compra na loja física também compra bastante online, sinal de que o canal físico não sustenta uma base de clientes exclusiva própria.
5. **Clientes de maior valor** — tabela dos top 8 por receita total (rank, estado, ID mascarado, pedidos, receita), recorte acionável para retenção/CRM respeitando a nota de privacidade acima.

## QA — resumo de achados

Auditoria completa em `docs/qa-findings.md` (propriedade do QA). Veredito final: **nenhum achado crítico, alto ou médio em aberto — a integração foi aprovada sem ressalvas.**

- **Auditoria Fase 0/1** (credenciais, RLS, chaves): sem achados. Confirmado via `mcp__supabase__get_advisors` que as 4 tabelas só têm a policy `public_select`, sem INSERT/UPDATE/DELETE liberado; nenhuma ocorrência de `SERVICE_ROLE`/`DATABASE_URL` em `dashboard/`.
- **Revisão de código das 3 seções**: mesmo padrão em todas — `"use client"`, client único de `lib/supabase.ts`, guarda contra `setState` após unmount, zero `select("*")`, zero N+1, cores de gráfico só via `lib/design-system.ts`, fórmulas de KPI conferidas 1:1 com `docs/TASKS.md`.
- **Bugs reais encontrados e corrigidos**:
  - **Clientes (C1, médio)**: erro do Supabase (`PostgrestError`) não é `instanceof Error`, então a mensagem real de falha era descartada e trocada por um texto genérico. Corrigido com `extractErrorMessage()` em `utils.ts`.
  - **Clientes (C2, baixo)**: tooltip usava a string `"var(--surface-1)"` em vez do token `chartSurface[mode]`. Alinhado com vendas/pricing.
  - **Vendas (V1, baixo)**: label de canal reescrito inline em vez de reusar `CHANNEL_LABEL` de `utils.ts`. Exportado e reusado.
  - **Pricing (P1, médio/testabilidade)**: agregação vivia dentro do `useEffect`, não como função pura testável. Extraída como `computePricing`, com testes diretos.
  - **Config (P3, baixo)**: faltava `.eslintrc.json`, travando `next lint` em ambiente não-interativo. Criado.
- **Suite de testes final**: `npm test` — 60/60 passando (vendas, pricing, clientes, 2 arquivos cada); `npx tsc --noEmit` limpo no projeto inteiro.
- **Achado de qualidade de dado (P2, não é bug de código)**: índice de competitividade artificial de 2,00x em "Tênis" — ver caveat na seção [Pricing](#pricing--posicionamento-competitivo) acima.

**Débito técnico conhecido** (baixa prioridade, decisão consciente do Leader de não corrigir agora — não bloqueia o uso do dashboard, registrado em `docs/TASKS.md` para uma iteração futura):
- 3 padrões diferentes de estado loading/error entre as seções (vendas: union discriminada; pricing: hook com booleans; clientes: `summary | null`) — todos funcionam e são testados, só não são o mesmo padrão.
- Pricing não extraiu um `ChartCard.tsx` próprio (o wrapper de card está duplicado inline em 4 arquivos); vendas/clientes já têm o componente.
- Formatadores (`formatBRL`, `formatInt`, `formatPercent`) reimplementados de forma quase idêntica em cada seção, por não existir um `lib/format.ts` compartilhado.

## Setup

Pré-requisitos: Node.js 18+ e acesso ao projeto Supabase (URL + chave anon).

```bash
cd dashboard
npm install                        # instala Next.js, React, Tailwind, Recharts, supabase-js
cp .env.local.example .env.local   # depois preencha as duas variáveis abaixo
npm run dev                        # sobe em http://localhost:3000
```

Variáveis de ambiente (`dashboard/.env.local`, nunca commitado):

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (`anon`) — só permite leitura, ver [Arquitetura de dados e segurança](#arquitetura-de-dados-e-segurança) |

Outros scripts disponíveis: `npm run build` (build de produção), `npm run lint`, `npm test` (suite de testes — 60 casos cobrindo as 3 seções) e `npx tsc --noEmit` (checagem de tipos).
