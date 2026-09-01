# Padrões de frontend — DevLib

Este documento registra as decisões visuais e de componentes definidas durante o protótipo de UI, para serem seguidas de forma consistente em toda implementação real de `apps/web`. Não é um guia teórico — cada regra aqui veio de uma tela que foi desenhada, mostrada e aprovada.

## Estilo geral

**Denso e técnico** — estilo "dashboard de dev", não minimalista/espaçado. Prioriza mostrar mais informação por tela em vez de respiro visual generoso. Ao dúvida entre "mais compacto" ou "mais arejado", escolher compacto.

## Biblioteca de componentes

**shadcn/ui + Tailwind CSS.** Usar os componentes base do shadcn (button, input, select, table, badge) como ponto de partida, não construir do zero.

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
- Linha inteira clicável, ícone de link externo (`ti-external-link`) ao lado de itens que levam a uma URL

### Cards de estatística (métricas no topo de dashboards)

- Grid de 2 colunas (`grid-template-columns: repeat(2, minmax(0, 1fr))`)
- Fundo `var(--surface-1)`, padding `1rem`, `border-radius: var(--radius)`
- Label pequeno (13px, `var(--text-secondary)`) acima do número
- Número grande: 24px, `font-weight: 500`

### Badges de categoria — paleta fixa

Usar sempre estas cores por categoria, para consistência entre telas:

| Categoria | Fundo | Texto |
|---|---|---|
| frontend / ui | `#E6F1FB` | `#0C447C` |
| backend | `#E1F5EE` | `#085041` |
| orm | `#EEEDFE` | `#3C3489` |
| validação | `#FAECE7` | `#712B13` |
| auth | `#FAEEDA` | `#633806` |

Badge: `font-size: 11px`, `padding: 2px 6-7px`, `border-radius: var(--radius)`.

### Formulários

- Label acima do campo, não ao lado — `font-size: 11-12px`, cor `var(--text-secondary)`, `margin-bottom: 3-4px`
- Inputs com `box-sizing: border-box` e `font-size: 12px` (bate com a densidade geral)
- Botão de ação principal usa `var(--fill-primary)` / `var(--on-primary)`, full-width quando é a ação primária do formulário (ex: login, salvar)
- Botões de navegação secundária (ex: "+ novo projeto") usam texto com seta `↗`, não ícone isolado

### Blocos de código / comandos

- Fundo `var(--surface-2)`, borda `0.5px solid var(--border)`, `border-radius: var(--radius)`
- Fonte monoespaçada, `font-size: 11-12px`
- Ícone de copiar (`ti-copy`) sempre visível, não só no hover

### Notas e texto livre

- Mesmo tratamento visual dos blocos de código (fundo `var(--surface-2)`, borda), mas com fonte normal, não monoespaçada

## Telas já prototipadas (referência)

Estas telas foram desenhadas e aprovadas durante o planejamento — servem de referência direta ao implementar as equivalentes reais:

- Dashboard de projetos (cards de estatística + lista densa de projetos)
- Detalhe do projeto (tabela densa de bibliotecas)
- Detalhe da biblioteca (comando de instalação, snippet de configuração, notas, "usado em")
- Login (formulário simples, sem distrações)
- Cadastro/busca de biblioteca (busca no npm/PyPI + formulário de confirmação)
- Associação cruzada projeto ↔ biblioteca (listas com botão de remover + seletor de adicionar)
- Dashboard de métricas (ranking de bibliotecas mais usadas, distribuição por categoria)

Ao implementar qualquer uma dessas, não redesenhar do zero — seguir a estrutura já validada, ajustando apenas o necessário para virar código de produção real.
