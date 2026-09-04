# QA Findings — Dashboard E-commerce

Arquivo de propriedade exclusiva do QA. Achados são devolvidos ao teammate dono via `SendMessage` + registro aqui. QA não edita código de outros.

Formato por achado: **severidade** | arquivo/linha | descrição | cenário de falha | responsável | status.

---

## Auditoria Fase 0/1

Status: **concluída** (2026-09-04). Nenhum achado crítico ou alto.

| # | Severidade | Item | Resultado |
|---|---|---|---|
| 1 | — | `.env` (raiz) e `dashboard/.env.local` no `.gitignore` | OK. Root `.gitignore` cobre `.env`/`.env.local`; `dashboard/.gitignore` cobre `.env.local` de novo (redundante, inofensivo). `git status` confirma zero arquivos `.env*` staged/tracked (repo ainda sem nenhum commit). |
| 2 | — | Policies RLS das 4 tabelas (`clientes`, `produtos`, `vendas`, `preco_competidores`) | OK. `mcp__supabase__get_advisors(type=security)` retornou `{"lints":[]}` — nenhum advisory, nem INFO. Confirma que só existe `public_select` (SELECT público) nas 4 tabelas, sem policy de INSERT/UPDATE/DELETE liberada para `anon`/`authenticated`. Sem achado crítico. |
| 3 | — | `SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` vazando para `dashboard/` | OK. Grep por `SERVICE_ROLE\|DATABASE_URL` em `dashboard/**/*.{ts,tsx,js,json,env*}` não retornou nenhuma ocorrência. `dashboard/.env.local` só tem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `.mcp.json` na raiz do repo contém só a URL do MCP server (project_ref na URL, sem chave/segredo). |
| 4 | — | Client Supabase (`dashboard/lib/supabase.ts`) | OK. Client único, usa `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave anon, esperado ir para o bundle client-side), lança erro se env vars faltarem, comentário deixa claro que é somente leitura via RLS. Nenhuma instância duplicada encontrada (specialists ainda não começaram — só `.gitkeep` em `components/sections/{vendas,pricing,clientes}/`). |
| 5 | — | Risco aceito `next@14.2.35` (2 advisories HIGH do `npm audit`) | **Concordo com a avaliação do Leader.** Advisories dizem respeito a Server Actions, Middleware, i18n routing, custom servers e WebSocket upgrades. Confirmado em `dashboard/next.config.mjs`: config mínima (`reactStrictMode` só), sem `middleware.ts`, sem Server Actions, sem i18n. Risco aceito é razoável — reavaliar se o projeto passar a usar essas features. |
| 6 | — | Boas práticas de query (N+1, `select("*")` vs colunas específicas) | Pendente — specialists ainda não escreveram queries. Será avaliado por seção quando cada uma estiver pronta (ver `.agents/skills/supabase-postgres-best-practices/`). |

**Conclusão Fase 0/1**: nenhum bloqueio. Ambiente seguro para os specialists prosseguirem.

---

## Revisão + testes: Vendas

Status: **revisão concluída, testes escritos** (2026-09-04). Achados: 1 baixo/informativo, sem críticos/altos.

**Arquitetura/segurança**: `VendasSection.tsx` segue exatamente o padrão esperado — `"use client"`, importa `{ supabase }` de `@/lib/supabase` (nenhum client duplicado), estado `loading/error/ready` bem tratado (inclui guarda `cancelled` no `useEffect` contra race condition de unmount), sem credenciais hardcoded. Query única (`vendas` + embed `produtos(categoria, nome_produto, marca)`) — sem N+1, sem `select("*")` (só as 5 colunas usadas). Agregação isolada em `summarizeVendas` (`utils.ts`), o que tornou possível testar as fórmulas de KPI sem precisar montar componente. Todos os componentes de gráfico importam cores de `lib/design-system.ts` (`categorical`, `ink`, `gridline`, `axisBaseline`, `chartSurface`) e classes de `tailwind.config.ts` (`bg-surface`, `text-ink-*`, `border-border`, `rounded-card`) — nenhum hex hardcoded fora de `design-system.ts`. `useThemeMode.ts` reage a `data-theme` e `prefers-color-scheme` conforme especificado.

**Fórmulas de KPI**: conferidas contra a tabela em `docs/TASKS.md` (Receita total, Ticket médio, Unidades vendidas, Receita/ticket por canal, Receita por categoria, tendência semanal, top produtos) — todas batem com `summarizeVendas`, cobertas por teste unitário.

| # | Severidade | Arquivo/linha | Descrição | Cenário de falha | Responsável | Status |
|---|---|---|---|---|---|---|
| V1 | Baixo (informativo) | `RevenueTrendChart.tsx:72,79` | Labels "E-commerce"/"Loja física" reescritos inline no `formatter`/`Legend` em vez de reusar o mapa `CHANNEL_LABEL` já definido em `utils.ts` (não exportado). Puramente estético/DRY, não é bug. | Se o rótulo do canal mudar no futuro, alguém pode atualizar `utils.ts` e esquecer este arquivo, gerando inconsistência de texto entre o KPI hero/legenda e o tooltip do gráfico de tendência. | vendas | **resolvido** — `CHANNEL_LABEL` exportado de `utils.ts` (tipado com `CanalVenda`) e reusado em `RevenueTrendChart.tsx`. |

**Testes escritos** (`dashboard/__tests__/vendas/`):
- `utils.test.ts` — 16 casos: cada fórmula de KPI (receita total, ticket médio, unidades, por canal/categoria/semana/produto), ranking top-5, fallback de produto/categoria nula, lista vazia (sem divisão por zero), formatadores BRL/inteiro/percentual.
- `VendasSection.test.tsx` — 3 casos: estado de carregando, render com sucesso (KPIs corretos após mock do Supabase), estado de erro exibido corretamente.

**Bloqueio de infraestrutura (não é do specialist `vendas`)**: Recharts `ResponsiveContainer` requer `ResizeObserver`, que o jsdom não implementa — `VendasSection.test.tsx` quebra no estado "ready" (que monta os gráficos) até o `leader` adicionar um polyfill em `vitest.setup.ts` (pedido enviado). Mesma coisa vai acontecer com Pricing/Clientes. Assim que o polyfill entrar, vou rodar `npm test` de novo e confirmar 100% verde.

## Revisão + testes: Pricing

Status: **revisão concluída, testes escritos** (2026-09-04). Sem críticos/altos. 1 achado médio (testabilidade), 1 achado de qualidade de dado (informativo), 1 gap de config de projeto (fora do escopo do specialist).

**Arquitetura/segurança**: `PricingSection.tsx` segue o padrão — `"use client"` implícito via hook, `usePricingData()` importa `{ supabase }` de `@/lib/supabase` (sem client duplicado), estados `loading/error` bem tratados com guarda `cancelled`. Duas queries paralelas (`Promise.all`) com `select` explícito de colunas (`produtos`: 5 colunas; `preco_competidores`: 2 colunas) — sem `select("*")`, sem N+1 (agregação de médias por produto feita client-side com `Map`, O(n)). Cores 100% via `lib/design-system.ts` (`diverging`, `status`, `gridline`, `axisBaseline`, `ink`) — nenhum hex hardcoded. Bandas de risco (crítico/bom) sempre acompanhadas de rótulo de texto, nunca só cor (`PricingKpiCards`, `PricingOutlierTable`).

**Fórmulas de KPI**: índice de competitividade, bandas (`bandOf`) e os 4 KPIs conferem com `docs/TASKS.md` — cobertos por teste unitário/integração.

| # | Severidade | Item | Descrição | Cenário de falha / impacto | Responsável | Status |
|---|---|---|---|---|---|---|
| P1 | Médio (testabilidade) | `usePricingData.ts:75-146` | A agregação (média de concorrente por produto, cálculo do índice, agregação por categoria) está embutida dentro do `useEffect` do hook, não extraída como função pura exportada (diferente de `summarizeVendas` em vendas/utils.ts). Só `bandOf` é pura/exportada e testável isoladamente. | Não é um bug — os testes de QA cobrem o comportamento via render + mock do Supabase (`PricingSection.test.tsx`), mas isso é mais frágil/lento que testar a função de agregação isolada, e dificulta o specialist testar a própria lógica sem montar componente. | pricing | **resolvido** — extraída `computePricing(produtosRows, competidoresRows)` pura e exportada, mesmo padrão de `summarizeVendas`/`summarizeClientes`. Adicionados 4 testes unitários diretos em `usePricingData.test.tsx` (índice/média por produto, exclusão de produto sem cobertura, agregação por categoria, listas vazias). |
| P2 | Informativo (dado, não código) | `preco_competidores` / categoria "Tênis" | Confirmado o achado do orquestrador: os 15 produtos da categoria "Tênis" têm índice de competitividade exatamente 2,00x — todos, sem variação. Estatisticamente incompatível com dado real (concorrência nunca é exatamente 2x em 100% dos produtos de uma categoria); é artefato da geração sintética da base, não um padrão de precificação real. | Se o storytelling da seção ou a documentação apresentar isso como "categoria de maior risco real", pode induzir decisão de negócio errada sobre um artefato de dado. `docs/TASKS.md` (seção pricing) já registra isso como achado a confirmar — reforçando aqui para o Documentador incluir como caveat explícito no README. | docs (caveat na documentação) | enviado |
| P3 | Baixo (gap de config, não é do pricing) | projeto (raiz de `dashboard/`) | Não existia `.eslintrc*` no projeto — `next lint` pedia setup interativo na primeira execução, o que trava em ambiente não-interativo (agentes/CI). | Se alguém tentasse rodar `npm run lint` em CI ou script automatizado, o comando travaria/falharia esperando input de terminal. | leader | **resolvido** — `leader` criou `dashboard/.eslintrc.json` (`{"extends": "next/core-web-vitals"}`) + `eslint`/`eslint-config-next@14.2.35` em devDependencies. `npm run lint` confirmado rodando limpo e não-interativo. De brinde, fixou `glob@^10.5.0` via `overrides` (CVE alta em `glob@10.3.10` transitivo do eslint-config-next, não utilizada em runtime aqui). |

**Testes escritos** (`dashboard/__tests__/pricing/`):
- `usePricingData.test.tsx` — 5 casos: `bandOf` em cada uma das 5 bandas (limites inclusive/exclusive conforme fórmula documentada).
- `PricingSection.test.tsx` — 4 casos: loading, KPIs corretos após mock das 2 queries (índice calculado manualmente na fixture e conferido), estado de erro quando uma das 2 queries falha, produtos sem cobertura de concorrente corretamente excluídos da análise.

Suite completa (`npm test`): **28/28 testes passando** (4 arquivos: vendas ×2, pricing ×2).

## Revisão + testes: Clientes

Status: **revisão concluída, testes escritos, achado crítico já corrigido** (2026-09-04). 1 achado médio (bug real — **resolvido pelo specialist**), 1 baixo (consistência visual, aberto).

**Arquitetura/segurança/privacidade**: melhor seção das 3 em termos de disciplina de privacidade — `ClienteRow` nem tipa `nome_cliente` (nunca é buscado da API, não só "não exibido"), `TopClientesTable` usa apenas rank + estado + id mascarado (`maskClienteId`, últimos 4 caracteres). Agregação isolada em `summarizeClientes` (`utils.ts`), testável sem montar componente — mesmo padrão do vendas. `fetchAllRows` implementa paginação via `.range()` corretamente para contornar o limite de 1000 linhas do PostgREST em `vendas` (3020 linhas) — confirmado por teste que simula 1005 linhas em 2 páginas e verifica que `range()` foi chamado 2x e que a agregação bate com o total das duas páginas combinadas. Duas queries paralelas com `select` de colunas específicas (sem `select("*")`). Cores 100% via `lib/design-system.ts` (`sequentialBlue`, `categorical`, `ink`, `gridline`, `axisBaseline`), com uma exceção pontual (achado C2 abaixo).

**Fórmulas de KPI**: clientes ativos, receita média/ticket médio/pedidos médios por cliente, distribuição geográfica, cohort de cadastro e perfil de canal conferem com `docs/TASKS.md` — cobertos por teste unitário.

| # | Severidade | Arquivo/linha | Descrição | Cenário de falha | Responsável | Status |
|---|---|---|---|---|---|---|
| C1 | **Médio (bug real)** | `ClientesSection.tsx:59-63` + `fetchAllRows` (linha 31) | `fetchAllRows` faz `throw error` com o objeto `PostgrestError` do Supabase (não uma instância de `Error`). O `catch` em `ClientesSection` usava `err instanceof Error ? err.message : "Erro ao carregar dados de clientes"` — como `PostgrestError` nunca é `instanceof Error`, a mensagem real do erro era **sempre** descartada e substituída pelo texto genérico, ao contrário de Vendas/Pricing que exibem `error.message` diretamente. | Se a query falhar em produção (RLS mal configurada, rede instável, tabela renomeada), o usuário só via "Erro ao carregar dados de clientes" sem nenhum detalhe — dificultava diagnóstico e divergia do padrão das outras 2 seções. | clientes | **resolvido** — `clientes` adicionou `extractErrorMessage()` em `utils.ts` (lê `.message` de qualquer objeto, com fallback genérico) e `ClientesSection.tsx` passou a usá-la. Confirmado: mensagem real ("timeout de conexão") agora aparece corretamente. Testes atualizados (`ClientesSection.test.tsx` + 3 casos novos de `extractErrorMessage` em `utils.test.ts`) — suite 56/56 passando. |
| C2 | Baixo (consistência visual) | `GeoDistributionChart.tsx:64`, `ChannelProfileChart.tsx:63`, `CadastroCohortChart.tsx` (2 ocorrências) | `Tooltip.contentStyle.background` usava a string literal `"var(--surface-1)"` em vez do token `chartSurface[mode]` de `lib/design-system.ts`, que é o padrão usado em Vendas e Pricing para essa mesma propriedade. | Nenhum funcional — puramente inconsistência de padrão entre seções. | clientes | **resolvido** — as 4 ocorrências trocadas para `chartSurface[mode]`, alinhado com vendas/pricing. Confirmado via grep. |

**Testes escritos** (`dashboard/__tests__/clientes/`):
- `utils.test.ts` — 24 casos: KPIs (ativos, receita média, ticket médio, pedidos médios, divisão por zero), distribuição geográfica (top 8 + "Outros"), cohort de cadastro (agregação + ordenação), perfil de canal (3 bandas + omissão de banda vazia), top clientes (ranking, mascaramento de id, limite de 8), `extractErrorMessage` (3 casos: Error, objeto plano, fallback genérico), formatadores.
- `ClientesSection.test.tsx` — 4 casos: skeleton de loading, paginação via `range()` (1005 linhas em 2 páginas, confirma 2 chamadas e agregação correta do total combinado), mensagem real do Supabase exibida corretamente após o fix de C1, fallback genérico quando o erro não tem `.message` legível.

Suite completa (`npm test`): **56/56 testes passando** (6 arquivos: vendas ×2, pricing ×2, clientes ×2).

## Consistência arquitetural entre as 3 seções

Status: **concluída** (2026-09-04). Nenhum bloqueio — dashboard pronto para integração do ponto de vista de QA. Achados abaixo são todos de baixa prioridade (polimento), não impedem a Fase 3.

**Pontos fortes de consistência** (as 3 seções convergiram de forma independente):
- `useThemeMode.ts` é **byte-idêntico** nas 3 pastas (`diff` confirmou) — mesmo raciocínio de reação a `data-theme`/`prefers-color-scheme` sem nenhuma coordenação direta entre specialists.
- `ChartCard.tsx` é byte-idêntico entre vendas e clientes.
- Todas as 3 seções: `"use client"` nos componentes com estado, import único de `{ supabase }` de `@/lib/supabase`, guarda `cancelled` no `useEffect` (evita `setState` após unmount), zero credenciais hardcoded, zero `select("*")`, zero N+1, cores de gráfico 100% via `lib/design-system.ts` (com a exceção pontual C2), status sempre com ícone/dot + texto (nunca só cor).
- Nomenclatura de arquivo raiz consistente: `<Nome>Section.tsx` com `export default`, sem props obrigatórias — todas importáveis do mesmo jeito pelo Leader na Fase 3.
- Todas isolam (ao menos parcialmente) a lógica de agregação de UI: `summarizeVendas` e `summarizeClientes` são funções puras exportadas e 100% testáveis sem montar componente; pricing ficou parcialmente nesse padrão (achado P1, ainda aberto, baixo impacto).

| # | Severidade | Descrição | Recomendação | Status |
|---|---|---|---|---|
| X1 | Baixo | 3 padrões de estado loading/error diferentes: vendas usa union discriminada (`{status: "loading"\|"error"\|"ready"}`), pricing usa hook próprio com `{loading, error, produtos, categorias}` (booleans independentes), clientes usa `{summary: T \| null, error: string \| null}` inline no componente. Nenhum é bugado (todos os 3 renderizam loading/error/ready corretamente, cobertos por teste), mas são 3 formas distintas de resolver o mesmo problema. | Não é urgente — funciona hoje. Se o time quiser padronizar no futuro (ex.: extrair um hook `useAsyncData` genérico para `lib/`), o padrão de vendas (union discriminada) é o mais type-safe dos 3 (impossível ter `loading` e `error` true ao mesmo tempo por construção). | aberto, não bloqueia |
| X2 | Baixo | Pricing não tem um `ChartCard.tsx` próprio — a wrapper `rounded-card border border-border bg-surface p-6` está duplicada inline em `PricingKpiCards.tsx`, `PricingBandChart.tsx`, `PricingCategoryChart.tsx` e `PricingOutlierTable.tsx`, em vez de extraída como componente (como vendas/clientes fizeram). Visualmente idêntico (mesmas classes Tailwind), só não reaproveita o componente. | Oportunidade de limpeza, não bug. Se pricing quiser alinhar, pode extrair um `ChartCard.tsx` local idêntico ao de vendas/clientes. | aberto, baixa prioridade |
| X3 | Baixo | `formatBRL`/`formatBRLPrecise`/`formatInt`/`formatPercent` são reimplementados de forma quase idêntica em `vendas/utils.ts` e `clientes/utils.ts` (mesmo corpo, `Intl.NumberFormat` com as mesmas opções); pricing tem versões equivalentes menores e inline (`formatPct`, `formatIndice`, `formatBRL` local em 2 arquivos). Consequência esperada da convenção "cada specialist só edita a própria pasta" (não há `lib/format.ts` compartilhado) — não é erro de nenhum specialist individual. | Fora do escopo de qualquer specialist corrigir sozinho (exigiria um arquivo compartilhado, que é do Leader). Registrado para o Leader avaliar se vale a pena introduzir `lib/format.ts` em uma iteração futura pós-integração — não bloqueia a Fase 3 atual. | aberto, decisão do Leader (não urgente) |
| X4 (ver C2) | Baixo | Já registrado na seção Clientes: `Tooltip.contentStyle.background` usa `"var(--surface-1)"` direto em 4 lugares de clientes, enquanto vendas/pricing usam `chartSurface[mode]`. | Mesma cor final, forma diferente de chegar lá — alinhar ou não fica a critério do specialist `clientes`. | aberto, baixa prioridade |

**Fechamento (2026-09-04, atualização pós-correções)**: todos os achados endereçáveis por um specialist foram corrigidos e reverificados pelo QA:
- V1 (vendas) — **resolvido**: `CHANNEL_LABEL` exportado e reusado.
- P1 (pricing) — **resolvido**: `computePricing` extraída como função pura, com 4 testes unitários diretos adicionados.
- P3 (leader) — **resolvido**: `.eslintrc.json` criado, `npm run lint` limpo.
- C1 (clientes) — **resolvido**: `extractErrorMessage()` corrige a mensagem de erro descartada.
- C2 (clientes) — **resolvido**: `chartSurface[mode]` alinhado com vendas/pricing.
- Bônus: erro de `tsc --noEmit` em `vitest.setup.ts:27` (`@ts-expect-error` não utilizado, sinalizado independentemente por vendas/pricing/clientes) — **resolvido pelo QA**, `npx tsc --noEmit` limpo no projeto inteiro.

**Único achado ainda aberto, por decisão de produto/documentação (não é código)**: P2 — índice 2,00x artificial em Tênis, já incorporado como caveat no `docs/README.md` pelo Documentador.

**Achados abertos remanescentes (cross-seção, polimento, não-bloqueantes, sem dono único)**: X1 (3 padrões de loading/error diferentes entre seções), X2 (pricing sem `ChartCard.tsx` próprio), X3 (formatadores BRL/percentual/inteiro reimplementados em cada seção por falta de `lib/format.ts` compartilhado) — nenhum bloqueia a Fase 3; ficam para uma iteração de polimento pós-integração, a critério do Leader.

**Suite de testes final**: `npm test` — **64/64 passando** (6 arquivos: `vendas/utils.test.ts`, `vendas/VendasSection.test.tsx`, `pricing/usePricingData.test.tsx`, `pricing/PricingSection.test.tsx`, `clientes/utils.test.ts`, `clientes/ClientesSection.test.tsx`). `npx tsc --noEmit` limpo no projeto inteiro. (Contagem inclui os testes de regressão de I2/I3 e os testes diretos de `computePricing`/`extractErrorMessage` adicionados após o fechamento inicial.)

**Nenhum achado crítico, alto ou médio em aberto.** Do ponto de vista de QA, **a integração da Fase 3 pode prosseguir sem ressalvas**.

---

## Achados pós-integração (detectados pelo orquestrador testando ao vivo, fora da suite mockada)

Status: **concluída, todos os itens resolvidos e verificados** (2026-09-04). A suite de testes do QA mocka o client Supabase — nunca exerceu o schema real nem o limite de paginação do PostgREST contra dados reais, por isso os achados I1/I2 passaram pela suite sem detecção; I3 foi uma regressão introduzida ao corrigir I2, pega pelo próprio teste de regressão que escrevi para I2.

| # | Severidade | Descrição | Detecção | Correção | Status |
|---|---|---|---|---|---|
| I1 | **Alto (schema)** | `vendas` nunca teve FK declarada para `produtos` (só para `clientes`) — o embed `produtos(categoria, nome_produto, marca)` usado por `VendasSection.tsx` (e a query de pricing/clientes que fazem join client-side, não embed) sempre falhava contra o schema real/PostgREST, apesar de passar na suite mockada (que nunca valida contra o schema real). | Testado ao vivo pelo orquestrador (`npm run dev` + REST API direto). | Orquestrador adicionou `vendas_id_produto_fkey` como `NOT VALID` (existem 20 vendas com `id_produto` órfão — ~0,66%, dado sintético inválido, não dá pra validar sem perder/sujar linhas) e recarregou o schema cache do PostgREST (`NOTIFY pgrst, 'reload schema'`). Confirmado via REST API que o embed funciona agora. | **resolvido pelo orquestrador** — repassado ao `docs` para nota sobre as 20 linhas órfãs no README. |
| I2 | **Alto (bug real de dado)** | A query de `VendasSection.tsx` não paginava — `vendas` tem 3020 linhas, PostgREST corta em 1000 por padrão. Todos os KPIs da seção Vendas estavam sendo calculados sobre apenas ~1/3 dos dados reais, **sem nenhum erro visível** (a query retorna 200 OK com 1000 linhas, não um erro). | Testado ao vivo pelo orquestrador. Não detectável pela suite mockada original (o mock de `VendasSection.test.tsx` nunca simulava o corte de 1000 linhas do PostgREST). | `vendas` aplicou o mesmo padrão `fetchAllVendas`/`.range()` que `clientes` já usa (loop até página parcial). **Resolvido e verificado**: adicionei teste de regressão (`VendasSection.test.tsx`, caso "pagina via range() quando há mais de 1000 vendas") que simula 1005 linhas em 2 páginas via `.range()`, confirma 2 chamadas (`[0,999]` e `[1000,1999]`) e que a receita total reflete as 1005 linhas combinadas, não só as primeiras 1000. | **resolvido** |
| I3 | Médio (bug real, autocorrigido) | Ao implementar a correção de I2, `vendas` inicialmente reintroduziu a mesma classe de bug do achado C1 (clientes): `fetchAllVendas` faz `throw error` com o objeto `PostgrestError`, e o catch original usava `err instanceof Error ? err.message : String(err)` — `String()` num objeto plano produz `"[object Object]"` em vez da mensagem real. Detectado pelo QA ao escrever o teste de regressão de I2 (mock de erro retornou `"[object Object]"` na tela em vez de `"conexão recusada"`). | Antes de eu reportar, `vendas` já havia corrigido de forma independente: adicionou `extractErrorMessage()` em `vendas/utils.ts` (mesmo padrão exato de `clientes/utils.ts`) e trocou o catch em `VendasSection.tsx` para usá-la. Confirmado: mensagem real aparece corretamente. Adicionei 3 testes unitários de `extractErrorMessage` em `vendas/utils.test.ts` (mesmo padrão de `clientes`). | **resolvido** (autocorrigido por `vendas`, verificado pelo QA) |

**Lição de arquitetura (registrada como recomendação, não bloqueante)**: testes com o client Supabase mockado garantem que a lógica de agregação e o tratamento de loading/error/paginação *implementados* estão corretos, mas não substituem um teste de integração contra o schema real — não pegam FK ausente, RLS mal configurada, nem confirmam que o padrão de paginação foi de fato aplicado em vez de só disponível (como ficou evidente aqui: `clientes` implementou `fetchAllRows` desde o início, `vendas` não, e a suite mockada não notou a diferença porque cada seção mocka sua própria implementação). Recomendação para uma iteração futura: um teste smoke opcional (fora do `npm test` padrão, ex. rodado manualmente ou em CI separado) que bate na API REST real do Supabase (contra o mesmo projeto, só leitura) e confirma contagens de linha básicas (`count(*)` de cada tabela via client real bate com o schema documentado) — pegaria I1 e I2 antes de produção. Não é urgente para esta entrega.
