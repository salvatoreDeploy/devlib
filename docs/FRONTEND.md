# Padrões de frontend — DevLib

Este documento registra o design system de `apps/web`: tokens de cor, tipografia, espaçamento e a especificação de cada tela/componente. **Fonte da verdade**: `devlib_design.pen` (editado via Pencil), que substitui o pacote HTML hi-fi de 2026-09-02 — ver `docs/DECISIONS.md`, entrada "`devlib_design.pen` supersede o pacote hi-fi de 2026-09-02". **Consultar antes de implementar ou alterar qualquer tela** — não redesenhar do zero o que já está especificado aqui, e não inventar cor/espaçamento fora da tabela de tokens abaixo.

> Sobre o `.pen`: consolida num único canvas versionável as mesmas três fontes que já embasavam o pacote anterior (`README.md`, `DevLib App.dc.html` hi-fi, `DevLib Wireframes.dc.html` lo-fi — confirmado lendo a seção "Arquivos analisados" do próprio `.pen`), mais telas de drawer explícitas que o pacote HTML não tinha desenhado por completo. Consultado via Pencil MCP (`get_variables`, `batch_get`) — não abrir o arquivo `.pen` com outra ferramenta, ele é binário/proprietário.

## Divergências desta reescrita em relação à versão anterior do documento

Registradas aqui porque mudam regras que telas já implementadas seguiam — não repetir o padrão antigo em código novo nem "corrigir de volta" achando que é engano:

- **Fluxos de criação/detalhe voltam a ser drawer, não página** — reversão da decisão de 2026-09-02 (ver `docs/DECISIONS.md`). `/projects/new`, `/libraries/new` e `/libraries/[id]` migram para `Sheet` (item próprio do Sprint 4, não feito nesta subtask de documentação).
- **Fonte mono passa a ser `Geist Mono`** (fallback `ui-monospace, Menlo, monospace`), não mais a stack genérica usada até aqui. Aplicar via `next/font` quando a subtask "Componentes base do design system" mexer em tipografia.
- **Botão primário é um componente só**, não duas famílias visuais. O `.pen` reusa o mesmo componente (retângulo raio 9px, padding `10px 16px`, bg `accent`/teal, ícone lucide no slot + label) tanto para criar quanto para confirmar — só troca o ícone (`Plus` para criar, `Check` para confirmar/salvar). O "+" deixou de ser texto literal.
- **Ícones de tab corrigidos**: Bibliotecas = `Menu` (era `List`), Métricas = `LayoutDashboard` (era `BarChart3`), Developers = `Code` (era `Code2`).
- **Link externo e divergência de versão são texto literal**, não ícone: prefixo `↗` (link) e sufixo `↑` (versão acima da usada no projeto), direto no `content` do texto, na cor do token relevante (`accent` para link, `warn` para divergência) — não o componente `ExternalLink`.

## Tema: escuro, sempre

Sem alternância pra claro. Todos os valores abaixo são a paleta única do app.

## Design tokens

### Cores

| Token (doc)            | Variável `.pen`                                                                                                                    | Hex                   | Variável CSS (`globals.css`)                           | Uso                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg`                   | `$bg`                                                                                                                              | `#09090B`             | `--background`                                         | fundo da aplicação                                                                                                                                             |
| `surface`              | `$surface`                                                                                                                         | `#0D0D10`             | `--card`                                               | cards, tabelas, inputs de filtro                                                                                                                               |
| `surface-drawer`       | `$surfaceDrawer`                                                                                                                   | `#0B0B0D`             | `--popover`                                            | painel lateral (drawer/Sheet)                                                                                                                                  |
| `surface-input`        | `$surfaceInput`                                                                                                                    | `#0E0E11`             | `--surface-input`                                      | inputs, textarea, select, blocos de código                                                                                                                     |
| `surface-subtle`       | `$surfaceSubtle`                                                                                                                   | `#0A0A0C`             | `--surface-subtle`                                     | rodapé de card (ex: footer do card de projeto)                                                                                                                 |
| `surface-raised`       | `$surfaceRaised`                                                                                                                   | `#101014`             | `--accent` (shadcn, hover neutro)                      | hover de linha de tabela, item de resultado de busca                                                                                                           |
| `chip`                 | `$chip`                                                                                                                            | `#15151A`             | `--secondary`                                          | chips/tags neutras                                                                                                                                             |
| `chip-alt`             | `$chipAlt`                                                                                                                         | `#17171A`             | `--chip-alt`                                           | badge BETA, tab ativa                                                                                                                                          |
| `border`               | `$border`                                                                                                                          | `#1E1E22`             | `--border`                                             | borda de card/tabela                                                                                                                                           |
| `border-strong`        | `$borderStrong`                                                                                                                    | `#26262B`             | `--input`                                              | borda de input, botão secundário, tab ativa                                                                                                                    |
| `border-soft`          | `$borderSoft`                                                                                                                      | `#1A1A1E`             | `--border-soft`                                        | divisor interno de card                                                                                                                                        |
| `border-row`           | `$borderRow`                                                                                                                       | `#141417`             | `--border-row`                                         | divisor de linha de tabela                                                                                                                                     |
| `border-faint`         | `$borderFaint`                                                                                                                     | `#17171A`             | `--border-faint`                                       | divisor de seção / borda inferior da tab bar                                                                                                                   |
| `checkbox-border`      | `$checkboxBorder` (= `$separator`, mesmo hex — o `.pen` define os dois nomes pro mesmo valor; usar só `checkbox-border` no código) | `#2E2E33`             | `--checkbox-border`                                    | borda de checkbox, avatar ring, separador "/" do breadcrumb                                                                                                    |
| `text`                 | `$text`                                                                                                                            | `#F4F4F5`             | `--foreground`                                         | texto principal                                                                                                                                                |
| `text-secondary`       | `$textSecondary`                                                                                                                   | `#D4D4D8`             | `--secondary-foreground`                               | labels de formulário (drawer), ênfase em linha de atividade                                                                                                    |
| `text-muted`           | `$textMuted`                                                                                                                       | `#A1A1A9`             | `--muted-foreground`                                   | parágrafos, valores mono                                                                                                                                       |
| `text-dim`             | `$textDim`                                                                                                                         | `#8B8B93`             | `--text-dim`                                           | legendas                                                                                                                                                       |
| `text-faint`           | `$textFaint`                                                                                                                       | `#71717A`             | `--text-faint`                                         | meta, placeholders de filtro                                                                                                                                   |
| `text-fainter`         | `$textFainter`                                                                                                                     | `#52525B`             | `--text-fainter`                                       | ícones "···", mono secundário                                                                                                                                  |
| `text-ghost`           | `$textGhost`                                                                                                                       | `#4E4E55`             | `--text-ghost`                                         | `::placeholder`                                                                                                                                                |
| **`accent`** (brand)   | `$accent`                                                                                                                          | `#2DE3BE`             | `--primary`                                            | **renomeado `brand` no código** pra não colidir com `--accent` do shadcn (que aqui significa hover neutro, não a cor de marca) — botão primário, links, barras |
| `accent-hover`         | `$accentHover`                                                                                                                     | `#5CEBCD`             | `--primary` (`hover:bg-primary/90` ou classe dedicada) | hover de botão primário                                                                                                                                        |
| `accent-ink`           | `$accentInk`                                                                                                                       | `#04231E`             | `--primary-foreground`                                 | texto sobre a cor de marca                                                                                                                                     |
| `accent-dim`           | `$accentDim`                                                                                                                       | `#22A88F`             | `--brand-dim`                                          | 2º nível de barra (ranking)                                                                                                                                    |
| `accent-dimmer`        | `$accentDimmer`                                                                                                                    | `#1A7A68`             | `--brand-dimmer`                                       | 3º nível de barra (ranking)                                                                                                                                    |
| `accent-bg`            | `$accentBg`                                                                                                                        | `#0B302A`             | `--brand-bg`                                           | fundo de badge PRO / status "atualizada"                                                                                                                       |
| `warn`                 | `$warn`                                                                                                                            | `#F5C451`             | `--warn`                                               | desatualizada, versão divergente                                                                                                                               |
| `warn-bg`              | `$warnBg`                                                                                                                          | `#33270B`             | `--warn-bg`                                            | fundo do badge "desatualizada"                                                                                                                                 |
| `danger`               | `$danger`                                                                                                                          | `#F2777A`             | `--destructive`                                        | depreciada, erro                                                                                                                                               |
| `danger-bg`            | `$dangerBg`                                                                                                                        | `#341617`             | `--danger-bg`                                          | fundo do badge "depreciada"                                                                                                                                    |
| `purple` / `purple-bg` | `$purple` / `$purpleBg`                                                                                                            | `#A98BFF` / `#241C3D` | `--purple` / `--purple-bg`                             | avatar de organização (fora de escopo, ver "Ressalvas de escopo"), fatia "orm" de gráfico                                                                      |
| `neutral-bar`          | `$neutralBar`                                                                                                                      | `#3F3F46`             | `--neutral-bar`                                        | última fatia do gráfico de categorias                                                                                                                          |
| `track`                | `$track`                                                                                                                           | `#1C1C20`             | `--track`                                              | trilha de progresso, avatar placeholder                                                                                                                        |
| `track-dark`           | `$trackDark`                                                                                                                       | `#141417`             | `--track-dark`                                         | trilha das barras de ranking                                                                                                                                   |
| `overlay`              | `$overlay`                                                                                                                         | `rgba(4,4,6,.62)`     | `--overlay`                                            | overlay atrás do drawer                                                                                                                                        |

Nunca escrever hex/cor literal num componente — sempre a classe Tailwind que resolve pro token (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary text-primary-foreground`, etc.), com as extensões acima (`bg-surface-input`, `text-text-faint`, `bg-warn-bg text-warn`, ...) expostas via `@theme inline` em `globals.css`.

### Tipografia

Fonte **Inter** (400/500/600/700), fallback `system-ui, sans-serif`, `-webkit-font-smoothing: antialiased` — `$fontHeading`/`$fontBody` no `.pen`. Mono: **`Geist Mono`** (`$fontMono`, novo — era stack genérica; carregar via `next/font` quando "Componentes base do design system" mexer nisso), fallback `ui-monospace, Menlo, monospace` (`font-mono`) — usada em versões, slugs, IDs, comandos e código.

| Elemento                | Tamanho / peso / detalhe                          |
| ----------------------- | ------------------------------------------------- |
| Título de tela (h2)     | 21px / 700 / `letter-spacing -0.015em`            |
| Título de drawer (h3)   | 19px / 700 / `-0.015em`                           |
| Título do login (h1)    | 26px / 700 / `line-height 1.25` / `-0.02em`       |
| Número de métrica       | 28px / 700 / `-0.02em`                            |
| Nome de card de projeto | 16px / 600                                        |
| Parágrafo (login)       | 15–15.5px / 400 / `line-height 1.65–1.7`          |
| Parágrafo (drawer)      | 13–13.5px / `line-height 1.6`                     |
| Linha de tabela         | 13.5px / 500; sub-linha mono 11.5px               |
| Label de formulário     | 12.5px / 500                                      |
| Meta / rodapé           | 12.5px; timestamps/mono 12px                      |
| Badge de status         | 10.5px / 700 / `letter-spacing .05em` / UPPERCASE |
| Badge BETA              | 10px / 600 / `letter-spacing .06em`               |
| Tab                     | 13.5px / 500                                      |
| Botão primário          | 12.5–13px / 600                                   |

### Ícones

**`lucide-react`** (já instalado) — nunca webfont/ligature, nunca emoji. Traço 1.8–2, `stroke-linecap: round`, 14–15px. Mapeamento confirmado lendo os nós de ícone do `.pen` (campo `icon`, biblioteca `lucide`):

| Uso                                              | Componente lucide                                     |
| ------------------------------------------------ | ----------------------------------------------------- |
| Confirmar / concluir (entrar, salvar, associar)  | `Check`                                               |
| Criar (mesmo componente de botão, ícone trocado) | `Plus`                                                |
| Cancelar (quando o outline button leva ícone)    | `X`                                                   |
| Busca                                            | `Search`                                              |
| Chevron de dropdown/breadcrumb                   | `ChevronDown`                                         |
| Menu / lista (tab Bibliotecas)                   | `Menu`                                                |
| Tag (tab Categorias)                             | `Tag`                                                 |
| Dashboard/barras (tab Métricas)                  | `LayoutDashboard`                                     |
| Código (tab Developers)                          | `Code`                                                |
| Upload de foto                                   | `Upload`                                              |
| Editar perfil                                    | `UserPen`                                             |
| Preferências                                     | `Settings`                                            |
| Ajuda                                            | `LifeBuoy`                                            |
| Sair da conta                                    | `LogOut`                                              |
| Menu de linha ("···")                            | texto literal `···`, não ícone                        |
| Link externo                                     | prefixo literal `↗` no texto (**não** `ExternalLink`) |
| Versão acima da usada no projeto (divergência)   | sufixo literal `↑` no texto, cor `warn`               |

### Espaçamento

- Padding horizontal de página: **40px** (`$pagePadding`); header `18px 40px`; conteúdo `32px 40px 60px` (dashboard `34px 40px 60px`)
- Drawer (`Sheet` do shadcn): largura **432px**, padding `26px 28px`, gap vertical **18px** (`$cardGap`), borda esquerda 1px `border`, overlay `$overlay` cobrindo a tela toda atrás
- Grid do dashboard: `1fr 340px` (coluna principal / rail direita), gap **48px**; cards de projeto `1fr 1fr`, gap **20px**
- Card de projeto: corpo `18px 18px 22px`, rodapé `12px 18px`
- Tabela: header `12px 18px`, linha `13px 18px`, rodapé `14px 18px`
- Colunas (Bibliotecas, dashboard): checkbox 26px · nome `flex:2.4` · versão 110px · status 130px · usada em 150px · "···" 40px (a versão real de biblioteca é Sprint 6 — schema atual não tem esse campo, ver "Ressalvas de escopo")
- Colunas (Categorias): checkbox 26px · nome `flex:1` · bibliotecas 200px · "···" 40px
- Campo de input: altura **40px** (`$inputHeight`, login 44px)

### Raios e alturas

- Card / tabela: **11px** (`$radiusCard`) · Input, textarea, select, botão de drawer: **8px** (`$radiusInput`, login 9px) · Botão primário (criar e confirmar): **9px** · Chip neutro, badge de status: **6px** · Badge BETA/PRO: **5px** · Botão ícone "···": **7px** · Checkbox: **4px** · Pílulas (filtro, tab, tag): **999px** (`$radiusPill`, `rounded-full`) · Avatar: **999px**
- Alturas: input **40px** (login **44px**) · filtro/pílula de busca **34px** · botão ícone "···" **28px** · avatar de header **34px** · textarea **76px**
- Barras de progresso: **5px** (plano — fora de escopo), **9px** (ranking), **10px** (categoria) — todas `border-radius: 99px`

### Sombras

Nenhuma. A hierarquia visual vem só de borda + fundo (`surface` `#0D0D10` sobre `bg` `#09090B`), nunca `box-shadow`.

## Biblioteca de componentes

**shadcn/ui + Tailwind CSS.** Componentes base como ponto de partida — `Table`/lista densa, `Sheet` (drawer lateral), `Select`, `Badge`, `Checkbox`, `Input`, `Textarea`, `Tabs` cobrem quase 1:1 o design. Não construir do zero o que o shadcn já resolve.

Os 10 componentes reutilizáveis do `.pen` (subtask "Componentes base do design system" revisa/cria estes no código):

| Componente `.pen` | Mapeamento shadcn/Tailwind                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Primary Button    | `Button` variant `default` — retângulo raio 9px, padding `10px 16px`, bg `accent`, ícone lucide (slot) + label, hover `accent-hover` |
| Outline Button    | `Button` variant `outline` — borda `border-strong`, raio 8px, sem preenchimento, ícone opcional                                      |
| Input Field       | `Input` + `Label` acima (12.5px/500, `text-secondary`)                                                                               |
| Updated Badge     | `Badge` custom — bg `accent-bg`, texto `accent`                                                                                      |
| Warning Badge     | `Badge` custom — bg `warn-bg`, texto `warn`                                                                                          |
| Danger Badge      | `Badge` custom — bg `danger-bg`, texto `danger`                                                                                      |
| Active Tab        | pílula `rounded-full`, bg `chip-alt`, borda `border-strong`, texto `text`                                                            |
| Inactive Tab      | pílula `rounded-full`, transparente, texto `text-faint`                                                                              |
| Metric Card       | card `surface`/`border`/raio 11px, label `text-faint` + valor 28px/700                                                               |
| Profile Dropdown  | `DropdownMenu`/painel próprio (ver seção "Profile Dropdown" abaixo)                                                                  |

## Botões — padrão único

Corrige a versão anterior deste documento, que descrevia duas famílias visuais (pílula de criação vs retângulo de confirmação) com o "+" como texto literal. Lendo o `.pen`, criação e confirmação usam **o mesmo componente** (Primary Button), só trocando o ícone do slot:

- **Primary Button** (usado tanto pra criar quanto pra confirmar/salvar/associar): retângulo raio **9px**, bg `accent`/teal, texto `accent-ink`, ícone lucide 14–15px no slot esquerdo + label, 12.5–13px/600, `padding: 10px 16px`, hover `accent-hover`. Ícone `Plus` quando a ação cria algo (ex: "Criar projeto", "Criar categoria"); ícone `Check` quando confirma/salva (ex: "entrar", "Salvar biblioteca", "Associar"). Rótulo em minúsculas na tela de login ("entrar"), capitalizado nos drawers ("Salvar biblioteca") — segue o `.pen` tela a tela, não uma regra única.
- **Outline Button** (ex: "Cancelar", "Gerenciar", "Remover"): sem preenchimento, borda `border-strong` (`#26262B`), texto `text-secondary`, raio 8px, hover `bg-chip`. Sem ícone na maioria dos usos reais (o componente reutilizável tem um slot de ícone `X`, mas os drawers desligam esse ícone — `enabled: false` — deixando só o texto); manter sem ícone salvo quando uma tela específica desenhar um.
- **Ícone isolado** ("···" de menu de linha): quadrado **28×28**, borda `border-strong`, raio 7px, glifo "···" em `text-fainter`, centralizado.
- **Pílulas de filtro/tab**: `rounded-full`, sem ícone (exceto tabs, que levam ícone + label) — ver `Active Tab`/`Inactive Tab` acima.

## Padrões por tipo de elemento

### Listas densas

- Linhas com borda inferior `border-row` (`#141417`) — **nunca** cards arredondados com sombra para itens de lista
- Última linha da lista não tem borda inferior
- Layout por linha: texto à esquerda, informação secundária alinhada à direita (contagem, data, versão)
- Linha inteira é clicável (não só um botão dentro dela); hover `surface-raised` (`#101014`)

### Tabelas

- Larguras de coluna fixas (ver "Espaçamento" acima), não fluidas
- Cabeçalho 12.5px/500 `text-faint`, `border-bottom` `border-soft`, checkbox 15×15 (borda `checkbox-border`, raio 4px)
- Nome 13.5px/500 + sub-linha mono 11.5px `text-fainter` (ex: nome do pacote, slug)
- Categoria como chip neutro (`chip`, borda `border-strong`, raio 6px, `text-muted`)
- Status como badge colorido — ver tabela de badges abaixo
- Linha inteira clicável; link externo usa prefixo literal `↗` na cor `accent`, não ícone

### Badges de status — paleta fixa

| Status        | Fundo                 | Texto              |
| ------------- | --------------------- | ------------------ |
| atualizada    | `accent-bg` `#0B302A` | `accent` `#2DE3BE` |
| desatualizada | `warn-bg` `#33270B`   | `warn` `#F5C451`   |
| depreciada    | `danger-bg` `#341617` | `danger` `#F2777A` |

`padding: 3px 9px`, raio 6px, 10.5px/700, `letter-spacing: .05em`, UPPERCASE. Toda linha da tabela de bibliotecas hoje usa "atualizada" fixo — rastreio real de versão é Sprint 6 (ver `docs/DECISIONS.md`, "Seção 'Bibliotecas' da Home: recorte do backlog").

### Badges de categoria

Categoria já é modelada como por-projeto no schema (`categories.project_id` nulável — ver `docs/DECISIONS.md`, 2026-09-02), então a divergência sinalizada na versão anterior deste documento **já está resolvida**, não é mais uma pendência de modelo.

Paleta por categoria (mantém a tabela já validada antes, funciona em fundo escuro):

| Categoria     | Fundo     | Texto     |
| ------------- | --------- | --------- |
| frontend / ui | `#E6F1FB` | `#0C447C` |
| backend       | `#E1F5EE` | `#085041` |
| orm           | `#EEEDFE` | `#3C3489` |
| validação     | `#FAECE7` | `#712B13` |
| auth          | `#FAEEDA` | `#633806` |

### Cards de estatística (métricas)

- Grid `repeat(4,1fr)` gap 18px (dashboard de métricas, fora de escopo) ou `1fr 340px`/2 cards (sidebar do dashboard de projetos)
- Fundo `surface` (`#0D0D10`), borda `border` (`#1E1E22`), raio 11px, padding 18px
- Label 12.5px `text-faint` acima do número
- Número 28px/700, cor `text` (ou `warn`/`danger` quando o valor em si é um alerta)

### Formulários

- Label acima do campo — 12.5px/500, cor `text-secondary` (drawer) ou sem label visível, só `placeholder` (login)
- Campo: altura 40px (login 44px), bg `surface-input` (`#0E0E11`), borda `border-strong` (`#26262B`), raio 8px (login 9px), 13.5px, `outline: none`
- Campos relacionados lado a lado em grid 2 colunas (ex: nome/versão); campos sem par ocupam a linha inteira
- Textarea: mesmo tratamento, altura 76px, `resize: none`, placeholder explicando o que escrever
- Botão de confirmação: ver "Botões" acima

### Campo de busca com resultados em dropdown

Input de busca + botão de lupa (40×40) ao lado; resultados numa lista densa logo abaixo (mesmo estilo de "Listas densas"), item selecionado com fundo `surface-raised`; cada linha clicável preenche o formulário abaixo. Usado no `.pen` pra busca de pacote npm/PyPI no drawer de biblioteca — **Sprint 6**, não implementar agora (ver "Ressalvas de escopo").

### Tags como pills + input

Pills neutras (`chip`, borda `border-strong`, raio 999px, 12px, com "×" pra remover) seguidas de uma pill tracejada "+ tag" (`border: 1px dashed checkbox-border`) que revela um input. Já implementado (Sprint 3).

### Blocos de código / comandos

- Fundo `surface-input` (`#0E0E11`), borda `border` (`#1E1E22`), raio 8px
- Mono (`Geist Mono`), 12.5px
- Usado no `.pen` pra comando de instalação e snippet de configuração — **Sprint 6**, schema atual não tem esses campos (ver "Ressalvas de escopo")

### Notas e texto livre

Mesmo tratamento visual do bloco de código, mas fonte normal (não mono), 13px/1.65, cor `text-muted`. Já implementado (campo `notes` do schema).

### Gráficos

- Barra de ranking: trilha `flex:1` 9px `track-dark`, preenchimento `border-radius:99px` — 1º item em `accent`, 2º–4º em `accent-dim`, restante em `accent-dimmer`; número mono `text-faint` à direita (largura fixa 20px)
- Barra empilhada por categoria: 10px, raio 99px, `overflow:hidden`, fatias na ordem `accent` → `accent-dim` → `accent-dimmer` → `purple` → `warn` → `neutral-bar`; legenda com ponto 8px + nome (`text-dim`) + % (`text-secondary`)
- Sem fundo claro na área do gráfico — as barras já têm contraste suficiente sobre o fundo escuro padrão

## Telas — especificação e mapeamento de rotas

`screen`/`drawer` do `.pen` viram **rotas/estados reais do Next.js** aqui, e nomes de fixture (`slug`) viram o `id` (uuid) que a API já usa.

### Login — `/login` (já implementado)

Viewport inteira, flex centralizado, padding 40px, coluna **420px**, gap 26px, **sem** `Card`/borda visível ao redor:

1. Marca: quadrado 26×26, raio 7px, borda 1.5px `accent`, "D" — texto "devlib.dev" 15px/500. Gap 10px.
2. H1 "Seu catálogo de bibliotecas" — 26px/700/`-0.02em`.
3. Parágrafo `text-muted`: "O DevLib guarda toda biblioteca que você usa - versão, categoria, comando de instalação e a nota do porquê você escolheu ela. Um lugar só, por projeto." (`line-height 1.7`).
4. Dois campos **sem label visível** — só `placeholder` ("nome@empresa.com", "••••••••") — altura 44px, gap 12px.
5. Linha: "esqueci minha senha" (13px `text-faint`) à esquerda; Primary Button "entrar" (ícone `Check`) à direita.
6. Divisor 1px `border` (`#1C1C20`); "ainda não tem conta? **criar conta**" (link em `accent`).

Sem mudança pendente nesta subtask — já bate com o `.pen`.

### App shell (header + tab bar) — layout compartilhado

**Header** `18px 40px`, sem borda inferior: marca 22×22 + "D" + badge `BETA` — "/" (`checkbox-border`) — quando dentro de um projeto, marca do projeto (avatar iniciais) + nome + `ChevronDown`. Direita: nome + e-mail do usuário autenticado, avatar circular com iniciais, `ChevronDown` (abre o Profile Dropdown).

> **Fora de escopo**: grupo de organização (avatar roxo + nome + badge PRO) entre a marca e o breadcrumb do projeto — depende de multiusuário/billing, pós-MVP. Não implementar.

**Tab bar** (só dentro de um projeto): `padding: 0 40px`, `border-bottom: 1px solid border-faint`. Tabs: pílula `padding: 8px 14px`, ícone 15px + label 13.5px/500. Ativa: bg `chip-alt`, borda `border-strong`, texto `text`. Inativa: transparente, `text-faint`.

- **Bibliotecas** (`Menu`) — tabela de bibliotecas do projeto, Sprint 3 (já implementado)
- **Categorias** (`Tag`) — Sprint 4, ver seção própria abaixo
- **Métricas** (`LayoutDashboard`) — Sprint 7 do `BACKLOG.md`, fora de escopo agora
- **Developers** (`Code`) — Sprint 8 do `BACKLOG.md`, fora de escopo agora

### Dashboard de projetos (Home) — `/` (Sprint 3, restilo no Sprint 4)

Grid `1fr 340px` gap 48px, padding `34px 40px 60px`.

**Coluna principal**:

- "Projetos" (h2) + Primary Button "Criar projeto" (ícone `Plus`) — abre o drawer "Criar projeto" (ver abaixo), não mais `/projects/new`.
- Grid 2×2 de cards (hover `border-color: checkbox-border`), corpo com nome 16px/600 + botão "···" 28×28, meta `text-faint` 13px ("N bibliotecas · lib1 · lib2 · lib3"); rodapé `surface-subtle` com avatar + "**quem** fez o quê **quando**" — fora de escopo (depende de tabela de atividade/multiusuário que não existe).
- Seção "Bibliotecas" (Sprint 3, seção existente) — o `.pen` mostra uma versão bem mais rica (cards de resumo Atualizadas/Desatualizadas/Depreciadas, filtros rápidos de status/categoria, coluna "Versão", footer "Mostrando X de Y" + "Abrir lista completa") do que a implementação atual. **Decisão já registrada** (`docs/DECISIONS.md`, 2026-09-09): manter o recorte atual (tabela simples com Biblioteca/Categoria/Status fixo/Usada em) até que staleness de versão (Sprint 6) e os itens de resumo/filtro virem itens de backlog próprios — não expandir esta seção como efeito colateral desta subtask de documentação.
- "Atividade de bibliotecas" (feed abaixo da seção Bibliotecas) — fora de escopo, mesma razão (sem tabela de atividade no schema).

**Coluna direita ("rail")**: "Atividade recente" + card "Plano" — **fora de escopo**, sem tabela de `activity` nem billing no MVP.

### Drawer "Criar projeto" → substitui `/projects/new` (Sprint 4)

Painel 432px, título "Criar projeto" + descrição "Cada projeto tem seu próprio catálogo de bibliotecas e versões.". Campos do `.pen`: "Nome do projeto", "Stack principal" (texto livre tipo "next · fastify · drizzle"), "Quem pode ver" (checkboxes de membros com avatar).

**Adaptação pro nosso escopo**: só **Nome** e **Descrição** (campos reais de `projects` no schema — `description` não existe no `.pen` mas já é usado pelo formulário atual e continua fazendo sentido manter). "Stack principal" fica de fora (não existe no schema, seria dado fictício); "Quem pode ver" fica de fora (multiusuário é pós-MVP). Ações: Outline Button "Cancelar" + Primary Button "Salvar" (ícone `Check`).

### Drawer "Adicionar biblioteca" → substitui `/libraries/new` (Sprint 4)

Painel 432px, título "Adicionar biblioteca" + descrição "Busque no npm ou pypi e o DevLib preenche versão, ecossistema e link da documentação.". Campos completos do `.pen`: busca de pacote (npm/pypi) com dropdown de resultados, Nome, Versão, Ecossistema (select), Categoria (select), Documentação (URL), Instalação (comando, bloco mono), Configuração básica (snippet, bloco mono), Links de documentação (pills "↗ documentação oficial" / "↗ repositório"), Tags, Notas, "Associar ao projeto" (select).

**Adaptação pro nosso escopo**: `libraries` no schema só tem `name`, `categoryId` e `notes` — nenhum campo de versão/ecossistema/docs/instalação/config existe ainda (isso é o provider npm/PyPI do **Sprint 6**). Manter só os campos já implementados (Sprint 3): **Nome**, **Categoria** (via `GET /categories`), **Tags** (input on-the-fly), **Notas** — só migrando o container de página pra `Sheet`. Busca de pacote, versão, ecossistema, documentação, instalação, config e links ficam de fora até o Sprint 6. "Associar ao projeto" já é implícito (a biblioteca nasce a partir da tela de um projeto).

### Drawer "Detalhe da biblioteca" → substitui `/libraries/[id]` (Sprint 4)

Painel 432px: nome + chip de categoria + chip de ecossistema + versão (mono, alinhado à direita) no topo; links "↗ documentação"/"↗ repositório"; bloco "Instalação" (comando mono); "Notas" (texto livre); "Usada em" (lista de projetos, cada um com a versão usada — um deles pode aparecer com sufixo `↑` em `warn` quando a versão diverge da mais recente); "Associar a um projeto" (select + Primary Button "Associar"); Outline Button "Fechar".

**Adaptação pro nosso escopo**: `libraries` não tem versão/ecossistema/docs/instalação (Sprint 6, mesma ressalva do drawer anterior). Manter: **Nome**, **chip de categoria**, **Notas**, **"Usada em"** (via `GET /libraries/:id/projects`, já implementado). "Associar a um projeto" fica de fora — é o item "Associar biblioteca a projeto (a partir da tela da biblioteca)" do **Sprint 5**, não desta subtask. Ação: só "Fechar".

### Aba Categorias do projeto — `Sheet`/tela dentro da tab bar (Sprint 4)

Header: "Categorias" (h2) + Primary Button "Criar categoria" (ícone `Plus`) + campo de busca (pílula 220px, ícone `Search`, placeholder "buscar categorias").

Tabela: checkbox 26px · Categoria (nome 13.5px/500 + sub-linha mono do "Slug") · Bibliotecas (contagem, 200px) · "···" 40px. Footer: "Mostrando X de Y categorias" + seletor "Itens por página" — paginação, a API atual não pagina.

**Adaptação pro nosso escopo**: `categories` não tem campo `slug` no schema — mostrar só o nome, sem sub-linha mono. Paginação do footer fica de fora (API retorna a lista inteira); manter só a contagem "Mostrando N categorias".

### Drawer "Criar categoria" (Sprint 4)

Painel 432px, título "Criar categoria" + descrição "Categorias agrupam bibliotecas com o mesmo papel no projeto.". Campos do `.pen`: Nome, Slug.

**Adaptação pro nosso escopo**: só **Nome** — `categories` não tem `slug` no schema (nem é gerado a partir do nome hoje). Ações: Outline Button "Cancelar" + Primary Button "Salvar" (ícone `Check`).

### Profile Dropdown (Sprint 4)

Painel 360px, `surface-drawer`, raio 11px, padding 14px, gap 14px, abre a partir do avatar do header.

Seções completas do `.pen`: identidade (avatar + nome + e-mail) + badge PRO; divisor; "Conta" (Organização/Plano/Função/Último acesso); divisor; "Atalhos" (Editar perfil `UserPen`, Preferências `Settings`, Ajuda `LifeBuoy`); divisor; "Sair da conta" (`LogOut`, cor `warn`).

**Adaptação pro nosso escopo** (bate com o texto da subtask no `BACKLOG.md`: "nome/e-mail/avatar, ações 'Editar perfil' e 'Sair'"): identidade (avatar + nome + e-mail, sem badge PRO) + **Editar perfil** (leva a `/profile`) + **Sair** (chama `POST /auth/logout` + `clearTokens()` + redireciona pra `/login` — resolve também o item de dívida técnica "Web: não existe fluxo de logout"). Seção "Conta" (organização/plano/função) fica de fora — multiusuário/billing pós-MVP. "Preferências" e "Ajuda" ficam de fora — sem tela/dado real por trás ainda.

### Tela de perfil — `/profile` (Sprint 4)

Header da página: "Atualizar perfil" + descrição. Grid: card de foto (360px, preview circular 104px + área de upload 260px + ações Carregar/Remover + resumo de conta Plano/Organização/Função) e coluna de formulários (Informações pessoais, Alterar senha, Preferências com 3 toggles).

**Adaptação pro nosso escopo**: card de foto com preview + upload real (`POST /users/me/photo`); resumo de conta (Plano/Organização/Função) fica de fora, mesma ressalva de multiusuário/billing. "Informações pessoais" cobre nome/e-mail (`PATCH /users/me`); "Alterar senha" cobre a troca de senha (mesma rota). Seção **"Preferências"** (resumo semanal, alertas de depreciação, compartilhar atividade) fica inteiramente de fora — já sinalizado no item do Sprint 4 do `BACKLOG.md`, sem dado real por trás.

### Demais telas (fora de escopo do Sprint 4)

Especificadas no `.pen`, mas não fazem parte deste sprint — consultar o `.pen` diretamente via Pencil quando a subtask correspondente for aberta, não implementar antecipadamente:

- **Métricas** (`Sprint 7`) e **Developers** (`Sprint 8`) — tabs desabilitadas por enquanto.
- **Presentation** e **Public Blog** (`Sprint 9`) — páginas públicas, decisão de rota/fonte de conteúdo ainda em aberto.
- **Create Account** — tela de cadastro completa (`/register` já existe de forma mais simples; alinhar ao `.pen` só quando isso virar item de backlog).

## Interações e comportamento

- Hover: botão primário → `accent-hover`; card de projeto → borda `checkbox-border`; linha de tabela → bg `surface-raised`; botão secundário → bg `chip`.
- Sem animação além de transições de hover padrão do Tailwind (`Sheet` do shadcn já tem transição própria de entrada/saída do drawer).
- Estados a implementar quando a tela real for construída (não desenhados no `.pen`): loading (skeleton), vazio, erro, toast de sucesso — decidir padrão na subtask que primeiro precisar disso, não adivinhar aqui.
