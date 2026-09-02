# Padrões de frontend — DevLib

Este documento registra o design system de `apps/web`: tokens de cor, tipografia, espaçamento e a especificação de cada tela/componente. **Fonte da verdade**: um pacote de design hi-fi (HTML + README) entregue em 2026-09-02, que substitui qualquer versão anterior deste documento. **Consultar antes de implementar ou alterar qualquer tela** — não redesenhar do zero o que já está especificado aqui, e não inventar cor/espaçamento fora da tabela de tokens abaixo.

> Sobre o pacote original: veio como dois arquivos HTML de referência visual (`DevLib App.dc.html` — hi-fi, todas as telas com dados fictícios; `DevLib Wireframes.dc.html` — lo-fi, **só estrutura/fluxo, nunca estilo**) mais um README com os tokens abaixo. Os HTMLs usam um runtime de streaming próprio da ferramenta que os gerou (`<x-dc>`, `{{ }}`, `<sc-if>`) — não são código pra copiar, só especificação visual a recriar com shadcn/ui + Tailwind.

## Tema: escuro, sempre

Sem alternância pra claro. Todos os valores abaixo são a paleta única do app.

## Design tokens

### Cores

| Token (doc)            | Hex                   | Variável CSS (`globals.css`)                           | Uso                                                                                                                                                            |
| ---------------------- | --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg`                   | `#09090B`             | `--background`                                         | fundo da aplicação                                                                                                                                             |
| `surface`              | `#0D0D10`             | `--card`                                               | cards, tabelas, inputs de filtro                                                                                                                               |
| `surface-drawer`       | `#0B0B0D`             | `--popover`                                            | painel lateral (drawer/Sheet)                                                                                                                                  |
| `surface-input`        | `#0E0E11`             | `--surface-input`                                      | inputs, textarea, select, blocos de código                                                                                                                     |
| `surface-subtle`       | `#0A0A0C`             | `--surface-subtle`                                     | rodapé de card (ex: footer do card de projeto)                                                                                                                 |
| `surface-raised`       | `#101014`             | `--accent` (shadcn, hover neutro)                      | hover de linha de tabela, item de resultado de busca                                                                                                           |
| `chip`                 | `#15151A`             | `--secondary`                                          | chips/tags neutras                                                                                                                                             |
| `chip-alt`             | `#17171A`             | `--chip-alt`                                           | badge BETA, tab ativa                                                                                                                                          |
| `border`               | `#1E1E22`             | `--border`                                             | borda de card/tabela                                                                                                                                           |
| `border-strong`        | `#26262B`             | `--input`                                              | borda de input, botão secundário, tab ativa                                                                                                                    |
| `border-soft`          | `#1A1A1E`             | `--border-soft`                                        | divisor interno de card                                                                                                                                        |
| `border-row`           | `#141417`             | `--border-row`                                         | divisor de linha de tabela                                                                                                                                     |
| `border-faint`         | `#17171A`             | `--border-faint`                                       | divisor de seção / borda inferior da tab bar                                                                                                                   |
| `checkbox-border`      | `#2E2E33`             | `--checkbox-border`                                    | borda de checkbox, avatar ring, separador "/" do breadcrumb                                                                                                    |
| `text`                 | `#F4F4F5`             | `--foreground`                                         | texto principal                                                                                                                                                |
| `text-secondary`       | `#D4D4D8`             | `--secondary-foreground`                               | labels de formulário (drawer), ênfase em linha de atividade                                                                                                    |
| `text-muted`           | `#A1A1A9`             | `--muted-foreground`                                   | parágrafos, valores mono                                                                                                                                       |
| `text-dim`             | `#8B8B93`             | `--text-dim`                                           | legendas                                                                                                                                                       |
| `text-faint`           | `#71717A`             | `--text-faint`                                         | meta, placeholders de filtro                                                                                                                                   |
| `text-fainter`         | `#52525B`             | `--text-fainter`                                       | ícones "···", mono secundário                                                                                                                                  |
| `text-ghost`           | `#4E4E55`             | `--text-ghost`                                         | `::placeholder`                                                                                                                                                |
| **`accent`** (brand)   | `#2DE3BE`             | `--primary`                                            | **renomeado `brand` no código** pra não colidir com `--accent` do shadcn (que aqui significa hover neutro, não a cor de marca) — botão primário, links, barras |
| `accent-hover`         | `#5CEBCD`             | `--primary` (`hover:bg-primary/90` ou classe dedicada) | hover de botão primário                                                                                                                                        |
| `accent-ink`           | `#04231E`             | `--primary-foreground`                                 | texto sobre a cor de marca                                                                                                                                     |
| `accent-dim`           | `#22A88F`             | `--brand-dim`                                          | 2º nível de barra (ranking)                                                                                                                                    |
| `accent-dimmer`        | `#1A7A68`             | `--brand-dimmer`                                       | 3º nível de barra (ranking)                                                                                                                                    |
| `accent-bg`            | `#0B302A`             | `--brand-bg`                                           | fundo de badge PRO / status "atualizada"                                                                                                                       |
| `warn`                 | `#F5C451`             | `--warn`                                               | desatualizada, versão divergente                                                                                                                               |
| `warn-bg`              | `#33270B`             | `--warn-bg`                                            | fundo do badge "desatualizada"                                                                                                                                 |
| `danger`               | `#F2777A`             | `--destructive`                                        | depreciada, erro                                                                                                                                               |
| `danger-bg`            | `#341617`             | `--danger-bg`                                          | fundo do badge "depreciada"                                                                                                                                    |
| `purple` / `purple-bg` | `#A98BFF` / `#241C3D` | `--purple` / `--purple-bg`                             | avatar de organização, fatia "orm" de gráfico                                                                                                                  |
| `neutral-bar`          | `#3F3F46`             | `--neutral-bar`                                        | última fatia do gráfico de categorias                                                                                                                          |
| `track`                | `#1C1C20`             | `--track`                                              | trilha de progresso, avatar placeholder                                                                                                                        |
| `track-dark`           | `#141417`             | `--track-dark`                                         | trilha das barras de ranking                                                                                                                                   |
| `overlay`              | `rgba(4,4,6,.62)`     | `--overlay`                                            | overlay atrás do drawer                                                                                                                                        |

Nunca escrever hex/cor literal num componente — sempre a classe Tailwind que resolve pro token (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary text-primary-foreground`, etc.), com as extensões acima (`bg-surface-input`, `text-text-faint`, `bg-warn-bg text-warn`, ...) expostas via `@theme inline` em `globals.css`.

### Tipografia

Fonte **Inter** (400/500/600/700), fallback `system-ui, sans-serif`, `-webkit-font-smoothing: antialiased`. Mono: `ui-monospace, Menlo, monospace` (`font-mono`, já configurado) — usada em versões, slugs, IDs, comandos e código.

| Elemento                | Tamanho / peso / detalhe                          |
| ----------------------- | ------------------------------------------------- |
| Título de tela (h2)     | 21px / 700 / `letter-spacing -0.015em`            |
| Título de drawer (h3)   | 19px / 700 / `-0.015em`                           |
| Título do login (h1)    | 26px / 700 / `line-height 1.25` / `-0.02em`       |
| Número de métrica       | 28px / 700 / `-0.02em`                            |
| Nome de card de projeto | 16px / 600                                        |
| Parágrafo (login)       | 15px / 400 / `line-height 1.65`                   |
| Parágrafo (drawer)      | 13.5px / `line-height 1.6`                        |
| Linha de tabela         | 13.5px / 500; sub-linha mono 11.5px               |
| Label de formulário     | 12.5px / 500                                      |
| Meta / rodapé           | 12.5px; timestamps 12px                           |
| Badge de status         | 10.5px / 700 / `letter-spacing .05em` / UPPERCASE |
| Badge BETA              | 10px / 600 / `letter-spacing .06em`               |
| Tab                     | 13.5px / 500                                      |
| Botão primário pílula   | 12.5px / 600                                      |
| Botão de drawer         | 13px / 600                                        |

### Ícones

**`lucide-react`** (já instalado) — nunca webfont/ligature, nunca emoji. O design usa traço 1.8–2, `stroke-linecap: round`, 14–15px. Mapeamento dos ícones citados neste documento:

| Uso                                             | Componente lucide              |
| ----------------------------------------------- | ------------------------------ |
| Confirmar / concluir (entrar, salvar, associar) | `Check`                        |
| Link externo / versão divergente                | `ExternalLink`                 |
| Copiar bloco de código                          | `Copy`                         |
| Busca                                           | `Search`                       |
| Chevron de dropdown/breadcrumb                  | `ChevronDown`                  |
| Menu / lista (tab Bibliotecas)                  | `List`                         |
| Tag (tab Categorias)                            | `Tag`                          |
| Barras (tab Métricas)                           | `BarChart3`                    |
| Código (tab Developers)                         | `Code2`                        |
| Exportar                                        | `Download`                     |
| Menu de linha ("···")                           | texto literal `···`, não ícone |

### Espaçamento

- Padding horizontal de página: **40px**; header `18px 40px`; conteúdo `32px 40px 60px` (dashboard `34px 40px 60px`)
- Drawer (`Sheet` do shadcn): largura **432px**, padding `26px 28px`, gap vertical **18px**
- Grid do dashboard: `1fr 340px`, gap **48px**; cards de projeto `1fr 1fr`, gap **20px**
- Métricas: 4 cards `repeat(4,1fr)` gap 18px; abaixo `1fr 380px` gap 24px
- Card de projeto: corpo `18px 18px 22px`, rodapé `12px 18px`
- Tabela: header `12px 18px`, linha `13px 18px`, rodapé `14px 18px`
- Colunas (Bibliotecas): checkbox 26px · nome `flex:2.4` · versão 110px · categoria 130px · status 130px · usada em 150px · "···" 40px
- Colunas (Categorias): checkbox 26px · nome `flex:1` · bibliotecas 200px · "···" 40px

### Raios e alturas

- Card / tabela: **11px** · Input, textarea, select, botão de drawer: **8px** (login: **9px**) · Chip neutro, badge de status: **6px** · Badge BETA/PRO: **5px** · Botão ícone "···": **7px** · Checkbox: **4px** · Pílulas (botão criar, filtro, tab, tag): **999px** (`rounded-full`) · Avatar: **999px**
- Alturas: input **40px** (login **44px**) · filtro/pílula de busca **34px** · botão ícone "···" **28px** · avatar de header **34px** · textarea **76px**
- Barras de progresso: **5px** (plano), **9px** (ranking), **10px** (categoria) — todas `border-radius: 99px`

### Sombras

Nenhuma. A hierarquia visual vem só de borda + fundo (`surface` `#0D0D10` sobre `bg` `#09090B`), nunca `box-shadow`.

## Biblioteca de componentes

**shadcn/ui + Tailwind CSS.** Componentes base como ponto de partida — `Table`/lista densa, `Sheet` (drawer lateral), `Select`, `Badge`, `Checkbox`, `Input`, `Textarea`, `Tabs` cobrem quase 1:1 o design. Não construir do zero o que o shadcn já resolve.

## Botões — padrão por tipo

Corrige uma versão anterior deste documento que dizia "todo botão termina com seta (`↗`)" — isso vinha do wireframe **lo-fi**, que o README explicitamente marca como não-autoritativo pra estilo. No hi-fi (fonte da verdade), o padrão real é:

- **Pílula de criação** (ex: "+ Criar projeto", "+ Adicionar biblioteca", "+ Criar categoria"): `rounded-full`, bg `primary`/teal, texto `primary-foreground`, prefixo "+" literal (não ícone) + label, 12.5px/600, `padding: 6px 12px`, hover `accent-hover`.
- **Confirmação/salvar** (ex: "entrar", "Salvar" nos drawers, "Associar"): retângulo arredondado **8–9px** (não pílula), bg `primary`/teal, texto `primary-foreground`, ícone **`Check`** (lucide, 14–15px) + label, 13–14px/600, `padding: 9-10px 15-16px`, hover `accent-hover`. Rótulo em minúsculas na tela de login ("entrar"), capitalizado nos drawers ("Salvar") — segue o hi-fi tela a tela, não uma regra única.
- **Secundário/outline** (ex: "Cancelar", "Exportar", "Gerenciar", pílulas de filtro "Categoria"/"Status"): sem preenchimento, borda `border-strong` (`#26262B`), texto `text-secondary`/`text-muted`, raio 7–8px (pílula quando for filtro), hover `bg-chip` (`#15151A`). Sem ícone, salvo quando o próprio design desenha um (busca, exportar).
- **Ícone isolado** ("···" de menu de linha): quadrado **28×28**, borda `border-strong`, raio 7px, glifo "···" em `text-fainter`, centralizado.

## Padrões por tipo de elemento

### Listas densas

- Linhas com borda inferior `border-row` (`#141417`) — **nunca** cards arredondados com sombra para itens de lista
- Última linha da lista não tem borda inferior
- Layout por linha: texto à esquerda, informação secundária alinhada à direita (contagem, data, versão)
- Linha inteira é clicável (não só um botão dentro dela); hover `surface-raised` (`#101014`)

### Tabelas

- Larguras de coluna fixas (ver "Espaçamento" acima), não fluidas
- Cabeçalho 12.5px/500 `text-faint`, `border-bottom` `border-soft`, checkbox 15×15 (borda `checkbox-border`, raio 4px)
- Nome 13.5px/500 + sub-linha mono 11.5px `text-fainter` (ex: nome do pacote)
- Versão sempre mono
- Categoria como chip neutro (`chip`, borda `border-strong`, raio 6px, `text-muted`)
- Status como badge colorido — ver tabela de badges abaixo
- Linha inteira clicável, ícone `ExternalLink` ao lado de itens que levam a uma URL

### Badges de status — paleta fixa

| Status        | Fundo                 | Texto              |
| ------------- | --------------------- | ------------------ |
| atualizada    | `accent-bg` `#0B302A` | `accent` `#2DE3BE` |
| desatualizada | `warn-bg` `#33270B`   | `warn` `#F5C451`   |
| depreciada    | `danger-bg` `#341617` | `danger` `#F2777A` |

`padding: 3px 9px`, raio 6px, 10.5px/700, `letter-spacing: .05em`, UPPERCASE.

### Badges de categoria

> **Divergência de modelo, sinalizada, não resolvida aqui**: o pacote de design trata categoria como algo **por projeto** (tela "Categorias" dentro de um projeto, com "Criar categoria" escopado a ele). `packages/db/schema.ts` tem `categories` **global/predefinida** (seed único de 10 categorias, sem `project_id`) — decisão já registrada em `docs/DECISIONS.md`. Ao implementar a tela de Categorias (fora do escopo desta atualização de documento), decidir com o usuário se o modelo muda ou se a tela vira só um filtro sobre as categorias globais existentes — não assumir um dos dois lados aqui.

Paleta por categoria (mantém a tabela já validada antes, funciona em fundo escuro):

| Categoria     | Fundo     | Texto     |
| ------------- | --------- | --------- |
| frontend / ui | `#E6F1FB` | `#0C447C` |
| backend       | `#E1F5EE` | `#085041` |
| orm           | `#EEEDFE` | `#3C3489` |
| validação     | `#FAECE7` | `#712B13` |
| auth          | `#FAEEDA` | `#633806` |

### Cards de estatística (métricas)

- Grid `repeat(4,1fr)` gap 18px (dashboard de métricas) ou `1fr 340px`/2 cards (sidebar do dashboard de projetos)
- Fundo `surface` (`#0D0D10`), borda `border` (`#1E1E22`), raio 11px, padding 18px
- Label 12.5px `text-faint` acima do número
- Número 28px/700, cor `text` (ou `warn`/`danger` quando o valor em si é um alerta, ex: "5 desatualizadas")

### Formulários

- Label acima do campo — 12.5px/500, cor `text-secondary` (drawer) ou sem label visível, só `placeholder` (login — ver seção Telas)
- Campo: altura 40px (login 44px), bg `surface-input` (`#0E0E11`), borda `border-strong` (`#26262B`), raio 8px (login 9px), 13.5px, `outline: none`
- Campos relacionados lado a lado em grid 2 colunas (ex: nome/versão, ecossistema/categoria); campos sem par ocupam a linha inteira
- Textarea: mesmo tratamento, altura 76px, `resize: none`, placeholder explicando o que escrever
- Botão de confirmação: ver "Botões" acima

### Campo de busca com resultados em dropdown

Input de busca + botão de lupa (40×40) ao lado; resultados numa lista densa logo abaixo (mesmo estilo de "Listas densas"), item selecionado com fundo `surface-raised`; cada linha clicável preenche o formulário abaixo.

### Tags como pills + input

Pills neutras (`chip`, borda `border-strong`, raio 999px, 12px, com "×" pra remover) seguidas de uma pill tracejada "+ tag" (`border: 1px dashed checkbox-border`) que revela um input.

### Blocos de código / comandos

- Fundo `surface-input` (`#0E0E11`), borda `border` (`#1E1E22`), raio 8px
- Mono, 12.5px
- Ícone `Copy` sempre visível, não só no hover

### Notas e texto livre

Mesmo tratamento visual do bloco de código, mas fonte normal (não mono), 13px/1.65, cor `text-muted`.

### Gráficos

- Barra de ranking: trilha `flex:1` 9px `track-dark`, preenchimento `border-radius:99px` — 1º item em `accent`, 2º–4º em `accent-dim`, restante em `accent-dimmer`; número mono `text-faint` à direita (largura fixa 20px)
- Barra empilhada por categoria: 10px, raio 99px, `overflow:hidden`, fatias na ordem `accent` → `accent-dim` → `accent-dimmer` → `purple` → `warn` → `neutral-bar`; legenda com ponto 8px + nome (`text-dim`) + % (`text-secondary`)
- Diferente de uma versão anterior deste documento: **não** há fundo claro na área do gráfico no hi-fi — as barras já têm contraste suficiente sobre o fundo escuro padrão. (A versão anterior desse detalhe veio de uma leitura equivocada de screenshots, não do pacote hi-fi.)

## Telas — especificação e mapeamento de rotas

`screen`/`tab`/`drawer` do protótipo (estado local de uma SPA de página única) viram **rotas reais do Next.js** aqui, e o `slug` do protótipo vira o `id` (uuid) que a API já usa (`GET /projects/:id`) — o schema não tem campo `slug`.

### Login — `/login` (já implementado, PR #30 — cores/ícone a corrigir nesta subtask)

Viewport inteira, flex centralizado, padding 40px, coluna **400px**, gap 24px, **sem** `Card`/borda visível ao redor (o hi-fi não desenha um card com borda pro login — é o conteúdo direto sobre o `bg`):

1. Marca: quadrado 26×26, raio 7px, borda 1.5px `accent`, "D" 13px/700 `accent`; ao lado "devlib.dev" 15px/500 `text`. Gap 10px.
2. H1 "Seu catálogo de bibliotecas" — 26px/700.
3. Parágrafo 15px `text-muted`, com um trecho em `text` puro pra ênfase.
4. Dois campos **sem label visível** — só `placeholder` ("seu e-mail", "sua senha") — altura 44px, bg `surface-input`, borda `border-strong`, raio 9px, gap 10px. (Adicionar `aria-label`/`sr-only` label pra acessibilidade não visível — não é uma mudança visual.)
5. Linha: "esqueci minha senha" (13px `text-faint`) à esquerda; botão primário "entrar" (ícone `Check` + label) à direita — ver "Botões".
6. Divisor 1px `border-faint`; "ainda não tem conta? **criar conta**" (link em `accent`).

Nossa versão atual (PR #30) tem: H1 menor ("Entrar" 24px em vez do texto de marketing), `Label`s visíveis acima dos campos, botão com `ArrowUpRight`, link cor indigo-400, card com borda visível. Todos esses pontos serão corrigidos nesta subtask pra bater com o hi-fi.

### App shell (header + tab bar) — layout compartilhado

**Header** `18px 40px`, sem borda inferior: marca 22×22 + badge `BETA` (`chip-alt`, borda `border-strong`) — "/" (`checkbox-border`) — org (fora de escopo hoje, é fixture do protótipo) — quando dentro de um projeto, "/" + nome do projeto + `ChevronDown`. Direita: nome + e-mail do usuário autenticado, avatar circular com iniciais, `ChevronDown`.

**Tab bar** (só dentro de um projeto): `padding: 0 40px`, `border-bottom: 1px solid border-faint`. Tabs: pílula `padding: 8px 14px`, ícone 15px + label 13.5px/500. Ativa: bg `chip-alt`, borda `border-strong`, texto `text`. Inativa: transparente, `text-faint`.

- **Bibliotecas** (`List`) — mapeia pra "tabela de bibliotecas do projeto", Sprint 3 (`Tela de detalhe do projeto`)
- **Categorias** (`Tag`) — ver divergência de modelo acima, fora de escopo até decidir
- **Métricas** (`BarChart3`) — Sprint 6 do `BACKLOG.md`
- **Developers** (`Code2`) — **não está em nenhum item do `BACKLOG.md` hoje** (API key management); não implementar sem adicionar ao backlog primeiro

Este shell (header + tabs) ainda não existe em `apps/web` — nasce quando a primeira tela pós-login (Dashboard de projetos, Sprint 3) for implementada.

### Dashboard de projetos — `/projects` (Sprint 3, "Dashboard de projetos (lista)")

Grid `1fr 340px` gap 48px, padding `34px 40px 60px`. Coluna principal: "Projetos" (h2) + pílula "+ Criar projeto"; grid 2×2 de cards (hover `border-color: checkbox-border`), corpo com nome 16px/600 + botão "···" 28×28, meta `text-faint` 13px; rodapé `surface-subtle` com avatar + "**quem** fez o quê **quando**". Coluna direita: "Atividade recente" (fora de escopo — não há tabela de `activity` no schema hoje) + card "Plano" (fora de escopo — sem billing no MVP).

**Adaptação pro nosso escopo**: implementar coluna principal (cards de projeto + criar); pular "Atividade recente" e "Plano" — não têm dado real por trás ainda (não estão no `BACKLOG.md`/schema).

### Drawer "Criar projeto" (8c) → nosso `/projects/new` (Sprint 3, já implementado, PR #30)

No hi-fi isso é um `Sheet` lateral, não uma página cheia — **decisão já tomada e mantida**: nosso app usa página própria (`/projects/new`) em vez de drawer, mesmo padrão do login (decisão registrada em `docs/DECISIONS.md`, não revisitar sem motivo novo). Campos do hi-fi: "Nome do projeto", "Stack principal" (fora de escopo — não existe campo de stack no schema), "Quem pode ver" (fora de escopo — sem multiusuário no MVP, ver `BACKLOG.md`). Nosso formulário fica com **Nome** e **Descrição** (campo do schema atual), estilizado com os tokens/raios/alturas de formulário desta página, botão de confirmação no padrão "Botões" acima.

### Demais telas (Bibliotecas do projeto, Adicionar biblioteca, Categorias, Métricas, Developers, Detalhe da biblioteca)

Especificadas em detalhe no pacote de design original (tokens, spacing e comportamento já cobertos pelas seções acima) — implementar quando a subtask correspondente do `BACKLOG.md` for iniciada, consultando este documento antes de estilizar. Não antecipar campos/telas que dependem de decisão de modelo ainda não tomada (categorias por projeto, API keys) — ver ressalvas acima.

## Interações e comportamento

- Hover: botão primário → `accent-hover`; card de projeto → borda `checkbox-border`; linha de tabela → bg `surface-raised`; botão secundário → bg `chip`.
- Sem animação além de transições de hover padrão do Tailwind — o pacote original especifica `dfade`/`dslide` para overlay/drawer (180ms/220ms); replicar ao implementar o primeiro drawer real (`Sheet` do shadcn já tem transição própria, avaliar se ainda precisa de customização).
- Estados a implementar quando a tela real for construída (não desenhados no pacote): loading (skeleton), vazio, erro, toast de sucesso — decidir padrão na subtask que primeiro precisar disso, não adivinhar aqui.
