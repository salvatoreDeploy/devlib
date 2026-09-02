# Padrões de frontend — DevLib

Este documento registra as decisões visuais e de componentes definidas durante o protótipo de UI, para serem seguidas de forma consistente em toda implementação real de `apps/web`. Não é um guia teórico — cada regra aqui veio de uma tela que foi desenhada, mostrada e aprovada. **Consultar antes de implementar ou alterar qualquer tela** — não redesenhar do zero o que já foi decidido aqui.

> Revisão de 2026-09-02: o documento original (Sprint 2) não deixava claro que o protótipo é em **tema escuro**, e a tela de login foi implementada em tema claro por engano — nunca fique só nos nomes dos tokens (`var(--fill-primary)` etc.), confira também os valores concretos desta revisão.

## Estilo geral

**Denso e técnico** — estilo "dashboard de dev", não minimalista/espaçado. Prioriza mostrar mais informação por tela em vez de respiro visual generoso. Ao dúvida entre "mais compacto" ou "mais arejado", escolher compacto.

## Tema: escuro, sempre

A aplicação é **tema escuro por padrão, sem alternância pra claro** — nenhuma tela do protótipo mostra um seletor de tema. Os tokens de cor do tema escuro já existem em `apps/web/app/globals.css` (bloco `.dark`, gerado pelo `shadcn init` da Sprint 2) — o único problema histórico é que a classe `dark` nunca foi aplicada em `<html>`, então tudo renderizava no tema claro do shadcn por engano.

- `apps/web/app/layout.tsx`: `<html lang="pt-BR" className="dark">` — sempre, não condicional.
- Nunca escrever cor literal (`bg-white`, `text-black`, `#fff`) num componente — sempre os tokens Tailwind já mapeados em `globals.css` (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`/`text-primary-foreground`, `border-border` etc.). Os valores concretos (fundo quase preto, texto quase branco, primário claro sobre fundo escuro) já vêm certos do tema `.dark` — não precisa hardcodar hex em lugar nenhum.
- **Exceção**: áreas de gráfico (dashboard de métricas) usam fundo claro mesmo dentro do tema escuro — ver seção "Gráficos" abaixo.
- **Links de texto** (ex: "esqueci minha senha", "criar conta", "documentação", "repositório", "buscar no npm/pypi") usam `text-indigo-400` (classe Tailwind direta, não um token de `globals.css` — a paleta neutra do shadcn não tem cor de destaque própria) + `underline-offset-4 hover:underline`. Não usar `text-primary` pra link de texto — no tema escuro `--primary` é quase branco/cinza claro, sem contraste suficiente com o resto do texto pra parecer clicável.

## Biblioteca de componentes

**shadcn/ui + Tailwind CSS.** Usar os componentes base do shadcn (button, input, select, table, badge) como ponto de partida, não construir do zero.

## Ícones

**Sempre `lucide-react`** (já instalado, `apps/web/package.json`) — nunca ícone via webfont/classe ligature (`ti-*` ou similar) e nunca emoji como ícone de UI. Mapeamento dos ícones citados neste documento:

| Uso                                               | Componente lucide |
| ------------------------------------------------- | ----------------- |
| Seta de ação em botão (`↗`)                       | `ArrowUpRight`    |
| Link externo (linha de tabela que leva a uma URL) | `ExternalLink`    |
| Copiar bloco de código                            | `Copy`            |

Tamanho padrão `size-4` (16px) inline com o texto, salvo indicação diferente do componente.

## Botões

- **Rótulo em minúsculas** (`entrar`, `salvar biblioteca`, `adicionar`, `associar`) — só títulos de tela (`<h1>`) usam a primeira letra maiúscula (frase), não os botões.
- **Toda ação de botão termina com `ArrowUpRight`** à direita do texto, com `gap-1`/`gap-2` — inclusive a ação primária de um formulário (ex: "entrar ↗", "salvar biblioteca ↗"). Não é um padrão exclusivo de navegação secundária.
- **Ação primária** (login, salvar formulário): variant `default` do componente `Button` (`bg-primary text-primary-foreground` — já resolve pra claro-sobre-escuro no tema `.dark`, não precisa de classe extra), full-width dentro de um formulário de card único.
- **Ação secundária/discreta** (ex: "+ associar" numa lista já existente): variant `outline` do componente `Button`, não full-width.

## Padrões por tipo de elemento

### Listas densas

- Linhas com `border-bottom: 0.5px solid var(--border)` entre itens — **nunca** cards arredondados com sombra para itens de lista
- Última linha da lista não tem borda inferior
- Layout por linha: ícone + texto à esquerda, informação secundária alinhada à direita (contagem, data, versão)
- Linha inteira é clicável (não só um botão dentro dela)

### Tabelas (quando a densidade da lista simples não é suficiente)

- `table-layout: fixed` com `colgroup` definindo largura de cada coluna explicitamente
- Cabeçalho com `font-weight: 400`, cor `var(--text-secondary)`, tamanho 12px
- Números de versão sempre em fonte monoespaçada (`font-family: var(--font-mono)`)
- Categoria como badge colorido (ver seção de cores abaixo), não texto puro
- Linha inteira clicável, ícone `ExternalLink` (lucide) ao lado de itens que levam a uma URL

### Cards de estatística (métricas no topo de dashboards)

- Grid de 2 colunas (`grid-template-columns: repeat(2, minmax(0, 1fr))`)
- Fundo **preto puro** (`bg-black` — mais escuro que `var(--card)`/`var(--surface-1)` ao redor, é um bloco de destaque deliberado, não a superfície padrão), padding `1rem`, `border-radius: var(--radius)`
- Label pequeno (13px, `var(--text-secondary)`) acima do número
- Número grande: 24px, `font-weight: 500`, cor `var(--foreground)` (quase branco)

### Badges de categoria — paleta fixa

Usar sempre estas cores por categoria, para consistência entre telas. São a mesma paleta pastel tanto em fundo claro quanto no fundo escuro do app — não precisa de variante `dark:` própria, o contraste já funciona nos dois casos:

| Categoria     | Fundo     | Texto     |
| ------------- | --------- | --------- |
| frontend / ui | `#E6F1FB` | `#0C447C` |
| backend       | `#E1F5EE` | `#085041` |
| orm           | `#EEEDFE` | `#3C3489` |
| validação     | `#FAECE7` | `#712B13` |
| auth          | `#FAEEDA` | `#633806` |

Badge: `font-size: 11px`, `padding: 2px 6-7px`, `border-radius: var(--radius)`.

### Formulários

- Label acima do campo, não ao lado — `font-size: 11-12px`, cor `var(--text-secondary)`, `margin-bottom: 3-4px`
- Inputs com `box-sizing: border-box` e `font-size: 12px` (bate com a densidade geral), fundo `var(--input)`/borda `var(--border)` do tema escuro (já resolvido pelos componentes shadcn, não hardcodar)
- Campos relacionados lado a lado num grid de 2 colunas (`grid-cols-2 gap-x-4`) — ex: nome/versão, ecossistema/categoria. Campos que não têm par (ex: link da documentação, notas) ocupam a linha inteira
- Botão de ação principal: ver seção "Botões" acima (full-width, rótulo minúsculo + `ArrowUpRight`)
- Textarea (notas, descrição longa): mesmo tratamento visual do input, com `placeholder` explicando o que escrever, não só um rótulo genérico

### Campo de busca com resultados em dropdown

Padrão da tela de cadastro de biblioteca (busca no npm/PyPI): input de busca + botão pequeno ao lado, resultados aparecem como uma lista densa logo abaixo (mesmo estilo de "Listas densas" acima — linhas com borda inferior, sem card), cada linha clicável pra preencher o formulário abaixo com os dados do resultado selecionado.

### Tags como pills + input

Tags existentes aparecem como pills (mesmo tratamento visual do badge de categoria, mas sem cor fixa — tom neutro `var(--secondary)`), seguidas por um botão discreto `+ tag` (variant `outline`, tamanho pequeno) que revela um input pra digitar uma tag nova.

### Blocos de código / comandos

- Fundo `var(--surface-2)`, borda `0.5px solid var(--border)`, `border-radius: var(--radius)`
- Fonte monoespaçada, `font-size: 11-12px`
- Ícone `Copy` (lucide) sempre visível, não só no hover

### Notas e texto livre

- Mesmo tratamento visual dos blocos de código (fundo `var(--surface-2)`, borda), mas com fonte normal, não monoespaçada

### Gráficos (dashboard de métricas)

- Diferente do resto do app: a área do gráfico em si tem **fundo claro** (`bg-white`/quase branco), mesmo com a página em tema escuro ao redor — prioriza a legibilidade de barras/eixos sobre a consistência de tema. Rótulos e legenda fora da área do gráfico continuam no tema escuro padrão
- Barras em azul sólido para ranking simples (uma série); paleta categórica (mesmas cores da tabela de badges) para distribuição por categoria

## Telas já prototipadas (referência)

Estas telas foram desenhadas e aprovadas durante o planejamento — servem de referência direta ao implementar as equivalentes reais:

- Dashboard de projetos (cards de estatística + lista densa de projetos, link "+ novo projeto" no topo)
- Detalhe do projeto (tabela densa de bibliotecas, link "editar" no topo)
- Detalhe da biblioteca (badges de categoria/ecossistema, links de documentação/repositório, comando de instalação, snippet de configuração, notas, "usado em")
- Login (card único centralizado, sem distrações — ver ressalva abaixo sobre elementos do protótipo sem funcionalidade correspondente ainda)
- Cadastro/busca de biblioteca (busca no npm/PyPI com resultados em dropdown + formulário de confirmação em grid 2 colunas + tags)
- Associação cruzada projeto ↔ biblioteca (listas com botão "+ associar" + seletor de adicionar)
- Dashboard de métricas (ranking de bibliotecas mais usadas, distribuição por categoria, área de gráfico em fundo claro)

Ao implementar qualquer uma dessas, não redesenhar do zero — seguir a estrutura já validada, ajustando apenas o necessário para virar código de produção real.

**Ressalva sobre o protótipo de login**: a tela mostra um subtítulo ("Acesse seu catálogo de bibliotecas"), um link "esqueci minha senha" (`/forgot-password`) e um rodapé "ainda não tem conta? criar conta" (`/register`) — implementados visualmente, com `href` real, mesmo sem a tela de destino existir ainda (`BACKLOG.md` não tem recuperação de senha nem registro via `apps/web`, só `POST /auth/register` na API) — decisão explícita do usuário, prioriza fidelidade ao protótipo. Clicar neles hoje leva à página 404 padrão do Next.js até essas telas serem implementadas.
