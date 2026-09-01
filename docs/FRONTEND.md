# Padrões de frontend — DevLib

Este documento registra as decisões visuais e de componentes definidas durante o protótipo de UI, para serem seguidas **exatamente** — não como inspiração livre — em toda implementação real de `apps/web`. Cada regra aqui veio de uma tela que foi desenhada, mostrada e aprovada. A seção "Telas já prototipadas" tem as referências visuais completas; o resto deste documento decompõe essas telas em padrões reutilizáveis.

## Tema: escuro é o padrão

**Toda a interface é escura.** Não é um modo opcional/toggle — não há previsão de tema claro no MVP. Qualquer tela nova nasce escura por padrão.

- Fundo de página e cards: tons quase pretos (near-black), não cinza-médio
- Cards/superfícies elevadas (stat cards, cards de detalhe, formulários) usam um tom sutilmente distinto do fundo da página — a separação é por cor de superfície, **não por borda ou sombra pronunciada**
- Texto principal: branco/quase-branco
- Texto secundário (labels, metadados, timestamps): cinza médio
- **Ação primária é monocromática, não colorida**: botão principal é fundo branco + texto preto (`var(--fill-primary)`/`var(--on-primary)` — nesse tema, isso significa branco sobre preto, não azul/verde de marca). Não introduzir uma cor de "brand" para botões — o único lugar com cor saturada são badges de categoria e o gráfico de métricas (paletas próprias, ver abaixo)
- Links (documentação, repositório, "esqueci minha senha", "criar conta", "buscar no npm/pypi") usam um tom de acento (violeta/azulado, sutil) — reservado só para links de texto, nunca para botões de ação primária

Valores exatos de cor (hex/oklch) ainda não foram extraídos pixel a pixel do protótipo — as variáveis abaixo têm valores provisórios em `apps/web/app/globals.css` (paleta neutra do shadcn/ui, tema escuro). Ajustar para os valores reais se/quando houver um export de design token; a estrutura (nomes de variável, hierarquia, "escuro é o padrão") já é definitiva.

## Estilo geral

**Denso e técnico** — estilo "dashboard de dev", não minimalista/espaçado. Prioriza mostrar mais informação por tela em vez de respiro visual generoso. Na dúvida entre "mais compacto" ou "mais arejado", escolher compacto.

## Biblioteca de componentes

**shadcn/ui + Tailwind CSS.** Usar os componentes base do shadcn (button, input, select, table, badge, textarea) como ponto de partida, não construir do zero. Ver `docs/DECISIONS.md` para detalhes de setup (versão do CLI, `forwardRef` obrigatório por causa do React 18).

## Ícones: `lucide-react`

Biblioteca de ícones padrão do projeto (já instalada como dependência, `components.json` do shadcn já declara `"iconLibrary": "lucide"`). Nunca usar caractere Unicode solto (ex: `↗` como texto) nem outra lib de ícone (as referências a `ti-*` — Tabler Icons — vindas de anotações do protótipo original foram mapeadas para o equivalente Lucide abaixo). Ícone como componente React (`import { ArrowUpRight } from "lucide-react"`), renderizado como filho direto do botão/link junto do texto — nunca como `background-image`/sprite.

| Uso                                      | Componente Lucide |
| ---------------------------------------- | ----------------- |
| Seta de ação (ver convenção abaixo)      | `ArrowUpRight`    |
| Link externo (tabelas, cards de detalhe) | `ExternalLink`    |
| Copiar (blocos de código)                | `Copy`            |

Tamanho: `size-4` (16px) por padrão, inline com texto — os componentes shadcn (`Button` etc.) já dimensionam automaticamente qualquer `<svg>` filho para esse tamanho.

## Convenção: ícone `ArrowUpRight` em toda ação

Qualquer link ou botão que **dispara uma ação ou navega para outro lugar** termina com o ícone `ArrowUpRight` (não é só para "navegação secundária", é a convenção geral): `+ novo projeto`, `+ adicionar`, `+ associar`, `salvar biblioteca`, `entrar`, `editar`, `documentação`, `repositório` — todos ganham o ícone ao lado do texto (depois do texto, exceto em links externos tipo "documentação"/"repositório", onde o ícone é `ExternalLink` antes do texto — ver "Cards de detalhe"). Texto + ícone Lucide, nunca ícone isolado sem texto nem botão grande chamativo (exceto quando o botão já é a ação primária full-width do formulário, que também leva o ícone).

## Padrões por tipo de tela

### Dashboard / tela de listagem (ex: Projetos)

- Cabeçalho: título da seção em negrito à esquerda, ação principal da tela ("+ novo projeto" + `ArrowUpRight`) alinhada à direita, mesma linha
- Grid de 2 cards de estatística logo abaixo do cabeçalho (ver seção própria)
- Lista densa dos itens abaixo dos cards

### Cards de estatística (métricas no topo de dashboards)

- Grid de 2 colunas (`grid-template-columns: repeat(2, minmax(0, 1fr))`)
- Fundo `var(--surface-1)`, padding `1rem`, `border-radius: var(--radius)`, sem borda visível
- Label pequeno (13px, `var(--text-secondary)`) acima do número
- Número grande: 24px, `font-weight: 500`, branco

### Listas densas

- Linhas com `border-bottom: 0.5px solid var(--border)` entre itens — **nunca** cards arredondados com sombra para itens de lista
- Última linha da lista não tem borda inferior
- Layout por linha: texto principal à esquerda (nome, em negrito se for o item "dono" da linha) — texto secundário abaixo dele em cinza menor quando houver (ex: stack de tecnologias separada por `·`)
- Informação secundária à direita, alinhada, geralmente empilhada em 2 linhas (métrica em cima, timestamp/detalhe embaixo, ambos alinhados à direita)
- Linha inteira é clicável (não só um botão dentro dela)
- Mesmo padrão vale para resultados de busca com autocomplete (ver "Campo de busca com resultados", abaixo) e para listas de associação ("usado em")

### Tabelas (quando a densidade da lista simples não é suficiente)

- `table-layout: fixed` com `colgroup` definindo largura de cada coluna explicitamente
- Cabeçalho com `font-weight: 400`, cor `var(--text-secondary)`, tamanho 12px
- Números de versão sempre em fonte monoespaçada (`font-family: var(--font-mono)`), cor secundária
- Categoria como badge colorido (ver paleta de badges abaixo) — a paleta de badge (fundo claro, texto escuro) é usada **sem alteração mesmo em fundo escuro**: os badges continuam pastel/claros, criando contraste de cor contra o card escuro
- Linha inteira clicável; ícone `ExternalLink` ao lado de itens que levam a uma URL externa

### Cards de detalhe (ex: biblioteca)

- Título grande em negrito à esquerda do cabeçalho do card; metadado alinhado (versão, em monoespaçado) à direita, mesma linha
- Badges logo abaixo do título (categoria + ecossistema, ex: "orm" + "node / npm")
- Linha de links externos relacionados (`ExternalLink` + "documentação", `ExternalLink` + "repositório" — ícone antes do texto, diferente da convenção geral de `ArrowUpRight` depois do texto), lado a lado
- Corpo dividido em seções rotuladas (label pequeno acima de cada uma, mesmo estilo de label de formulário): "instalação" e "configuração básica" usam bloco de código; "notas" usa o mesmo tratamento visual do bloco de código mas com fonte normal; "usado em" usa lista densa de associações (nome do projeto + versão usada nele, à direita)

### Formulários

- Label acima do campo, não ao lado — `font-size: 11-12px`, cor `var(--text-secondary)`, `margin-bottom: 3-4px`
- Inputs com `box-sizing: border-box` e `font-size: 12px` (bate com a densidade geral)
- Campos relacionados (ex: nome/versão, ecossistema/categoria) em grid de 2 colunas lado a lado; campos de texto livre (link, notas) ocupam a linha inteira
- Tags como chips removíveis + botão "`+ tag`" no mesmo estilo dos chips, para adicionar uma nova
- Textarea com resize handle visível (não desabilitar o resize nativo)
- Botão de ação principal usa `var(--fill-primary)`/`var(--on-primary)` (branco sobre preto neste tema), full-width quando é a ação primária do formulário (ex: login, salvar biblioteca)

### Campo de busca com resultados (autocomplete)

Usado tanto para "buscar no npm/PyPI" (cadastro de biblioteca) quanto para selecionar de um catálogo já existente (ex: "adicionar biblioteca do catálogo" na tela de projeto):

- Input de busca (texto ou select) com um botão pequeno e quadrado ao lado (ícone de busca/confirmar), não um botão de texto largo
- Resultados aparecem como lista densa logo abaixo (mesmo padrão de "Listas densas": border-bottom entre itens, nome à esquerda, versão/metadado à direita)
- Quando não há campo de busca livre (só select + versão), o padrão simplifica para: select + input de versão + botão "+ ação" + `ArrowUpRight`, tudo numa linha só (ver "Widget de associação")

### Widget de associação (projeto ↔ biblioteca)

- Select (biblioteca ou projeto, dependendo de qual lado da associação) + input de versão + botão "+ associar" + `ArrowUpRight`, os três lado a lado numa linha
- Mesmo padrão nos dois sentidos da associação (tela de projeto associando biblioteca, e tela de biblioteca associando a um projeto) — não criar dois componentes diferentes para a mesma interação espelhada

### Telas de autenticação (login, etc.)

- Tela centralizada (vertical e horizontalmente), card único, sem elementos de distração ao redor (sem header, sem sidebar)
- Título curto em negrito + subtítulo de uma linha em cinza explicando a tela (ex: "Entrar" / "Acesse seu catálogo de bibliotecas")
- Campos empilhados, label acima de cada um (padrão de formulário)
- Link de ação secundária relacionada ao campo (ex: "esqueci minha senha") alinhado à direita, logo abaixo do campo relacionado, pequeno
- Botão de ação primária full-width, mesmo padrão de formulário (branco sobre preto)
- Rodapé do card com texto + link de navegação alternativa (ex: "ainda não tem conta? criar conta"), centralizado

### Métricas / gráficos

- Mesmo grid de stat cards no topo (ver "Cards de estatística")
- Ranking simples (ex: bibliotecas mais usadas): gráfico de barra horizontal, cor única (azul da paleta de gráfico, não a paleta de badge)
- Distribuição por categoria: barra empilhada horizontal com legenda colorida abaixo (nome + porcentagem por cor)
- A paleta de cor do gráfico é **independente** da paleta de badges — ver seção própria abaixo. Não reutilizar as cores de badge no gráfico.

## Paleta de badges — categoria (fundo claro + texto escuro, mesmo em tema escuro)

| Categoria     | Fundo     | Texto     |
| ------------- | --------- | --------- |
| frontend / ui | `#E6F1FB` | `#0C447C` |
| backend       | `#E1F5EE` | `#085041` |
| orm           | `#EEEDFE` | `#3C3489` |
| validação     | `#FAECE7` | `#712B13` |
| auth          | `#FAEEDA` | `#633806` |

Badge: `font-size: 11px`, `padding: 2px 6-7px`, `border-radius: var(--radius)`.

## Paleta de gráficos (categórica, distinta da paleta de badges)

Observada no dashboard de métricas — cores saturadas/sólidas, não pastéis, para leitura de gráfico. Valores exatos ainda não extraídos pixel a pixel; hex abaixo são aproximações a confirmar:

| Categoria | Cor aproximada  |
| --------- | --------------- |
| frontend  | azul            |
| backend   | laranja         |
| ui        | verde-água      |
| orm       | dourado/amarelo |
| validação | rosa            |
| auth      | verde           |

Nota: no gráfico, "frontend" e "ui" aparecem como fatias **separadas** (diferente da paleta de badge, que trata "frontend / ui" como uma categoria só) — ao implementar o gráfico de distribuição por categoria, confirmar com o protótipo se isso é intencional antes de assumir.

## Blocos de código / comandos

- Fundo `var(--surface-2)`, borda `0.5px solid var(--border)`, `border-radius: var(--radius)`
- Fonte monoespaçada, `font-size: 11-12px`
- Ícone `Copy` sempre visível, não só no hover

## Notas e texto livre

- Mesmo tratamento visual dos blocos de código (fundo `var(--surface-2)`, borda), mas com fonte normal, não monoespaçada

## Telas já prototipadas (referência)

Estas telas foram desenhadas e aprovadas durante o planejamento — servem de referência direta ao implementar as equivalentes reais:

- Dashboard de projetos (cards de estatística + lista densa de projetos)
- Detalhe do projeto (tabela densa de bibliotecas + widget de associação)
- Detalhe da biblioteca (badges, links externos, comando de instalação, snippet de configuração, notas, "usado em" + widget de associação)
- Login (formulário simples, sem distrações) — **implementado em `apps/web/app/login/page.tsx`, tema escuro e ícone `ArrowUpRight` já aplicados**
- Cadastro/busca de biblioteca (busca no npm/PyPI com autocomplete + formulário de confirmação com tags/textarea)
- Associação cruzada projeto ↔ biblioteca (widget de associação nos dois sentidos)
- Dashboard de métricas (ranking de bibliotecas mais usadas, distribuição por categoria)

Ao implementar qualquer uma dessas, não redesenhar do zero — seguir a estrutura já validada, ajustando apenas o necessário para virar código de produção real.
