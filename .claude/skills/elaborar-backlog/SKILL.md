---
name: elaborar-backlog
description: Use ao transformar uma ideia crua ou uma dor em um item novo do BACKLOG.md (sprint, task ou subtask) — faz brainstorm e perguntas ricas sobre motivação, escopo MVP/pós-MVP, dependências e critério de pronto, e fecha com um plano de aprovação explícito antes de escrever qualquer coisa no backlog. Invoque com /elaborar-backlog, ou quando o usuário disser "quero adicionar uma ideia ao backlog", "preciso planejar uma sprint/task nova" ou "tenho uma dor que precisa virar tarefa".
---

# Elaborar uma ideia em item do backlog

Existe um processo rigoroso pra **implementar** um item do backlog (`/nova-feature`: plano → specs → código → testes → PR). Esta skill é o equivalente do lado de **criar** um item bem-formado no backlog a partir de uma ideia crua — sem ela, isso acontece ad-hoc: sem checar contra o escopo do MVP, sem levantar dependências em aberto, sem decidir a quebra em subtasks antes de escrever. Nunca editar o `BACKLOG.md` a partir de uma ideia sem passar por este fluxo primeiro, mesmo que a ideia pareça simples ou o usuário já tenha dado bastante detalhe.

## 0. Identificar o tipo de mudança

Antes de qualquer coisa, classifique o pedido:

- **Subtask nova** numa task já existente (ex: "falta mais uma coisa na tela de detalhe da biblioteca")
- **Task nova** dentro de uma sprint já existente ou em andamento
- **Sprint nova** — um tema/entrega maior, ainda sem lugar no roadmap

Se não estiver claro qual dos três é, pergunte ao usuário antes de seguir — o tamanho do questionamento nos passos seguintes muda de acordo.

## 1. Brainstorm antes de perguntar

Antes de levar qualquer pergunta ao usuário, gere sozinho um brainstorm curto da ideia — isso torna as perguntas do passo seguinte específicas em vez de genéricas:

- Que funcionalidades/telas/rotas essa ideia provavelmente implica, mesmo que o usuário não tenha citado? (ex: "perfil do usuário" costuma implicar CRUD + upload de foto + logout, mesmo que só "editar perfil" tenha sido dito)
- Que casos de borda ou cenários alternativos existem? (erro, estado vazio, permissão, usuário sem dado ainda)
- Que abordagens alternativas existem pra essa dor, além da primeira que veio à cabeça? A mais óbvia é mesmo a certa?
- Essa ideia colide, se sobrepõe ou já está coberta por algo em `BACKLOG.md`, `docs/DECISIONS.md` ou por uma divergência já sinalizada em `docs/FRONTEND.md`?

Leve esse brainstorm pro próximo passo como munição pras perguntas — não pra decidir sozinho no lugar do usuário, mas pra perguntar coisas que ele talvez não tenha pensado em mencionar.

## 2. Levantar o motivo — PARE E PERGUNTE

Nunca aceite a primeira formulação da ideia como está. Pergunte, explicitamente:

- **Motivação**: que dor ou oportunidade motiva isso? Qual o "porquê"? (isso vira o `Contexto` de uma futura entrada em `docs/DECISIONS.md`, se a subtask correspondente envolver uma escolha não óbvia)
- **Quem sente essa dor**: é um problema de uso real (algo que já doeu ao usar o app) ou uma antecipação de necessidade futura? Ideias antecipadas merecem mais escrutínio — `CLAUDE.md` pede evitar abstração/feature prematura.
- **O que o brainstorm do passo 1 revelou**: confirme com o usuário quais dos pontos levantados fazem parte do escopo pretendido e quais não fazem.

## 3. Escopo e enquadramento — PARE E PERGUNTE

- **MVP ou pós-MVP?** Confrontar com a seção "Escopo do MVP" do `BACKLOG.md` — se não for óbvio, perguntar ao usuário explicitamente onde isso se encaixa.
- **Onde no roadmap**: entra na sprint em andamento, numa sprint futura já existente, ou precisa de uma sprint nova? Se for sprint nova, as sprints seguintes precisam ser renumeradas — avisar disso antes de escrever.
- **Dependências**: depende de alguma decisão de design/arquitetura ainda não tomada (ex: mecanismo de auth novo, modelo de dado em aberto)? Se sim, seguir o padrão já usado em "Sprint 8 — API pública" (bloco de citação explicando o que precisa ser decidido antes da primeira subtask) em vez de já descer para subtasks concretas.
- **Não-objetivos**: o que fica de fora de propósito, pra não crescer escopo depois? Registrar isso explicitamente na entrada do backlog quando não for óbvio.

## 4. Quebra em subtasks — PARE E PERGUNTE

- Se for uma task nova (ou sprint nova com várias tasks), já proponha a quebra em subtasks — cada uma pequena o suficiente pra virar um PR revisável sozinho (mesmo critério do passo 0 de `/nova-feature`).
- Pra cada subtask, tenha clareza do critério de pronto (o que precisa ser verdade pra marcar o checkbox) — não precisa documentar isso no backlog linha a linha, mas a conversa deve deixar isso inequívoco antes de escrever.
- Pergunte se a ordem das subtasks importa (dependência entre elas) — a ordem em que aparecem no backlog deveria refletir a ordem de implementação esperada.

## 5. Plano de aprovação — PARE E PEÇA APROVAÇÃO

Depois dos passos 2-4, monte um plano de aprovação curto, sempre neste formato:

```
## Ideia
[frase que resume a ideia/dor original]

## Motivação
[o "porquê", já refinado pelas respostas do usuário]

## Enquadramento
- MVP ou pós-MVP: ...
- Sprint: [nova/existente — número e nome]
- Dependências / decisões em aberto: [ou "nenhuma"]
- Não-objetivos: [o que fica de fora]

## Subtasks propostas
- [ ] ...
- [ ] ...

## Como ficaria no BACKLOG.md
[trecho exato, em markdown, pronto pra colar no arquivo]
```

Mostre esse plano ao usuário e pergunte explicitamente se pode escrever. Só editar `BACKLOG.md` depois de um "sim" ao plano — nunca a partir de "parece que é isso que o usuário quis dizer", mesmo que a conversa toda pareça já ter deixado claro.

## 6. Escrever e fechar

- Editar `BACKLOG.md` seguindo exatamente a convenção já usada (indentação de subtask, formato de sprint, bloco de citação pra dependência em aberto quando aplicável).
- Se a sprint precisou ser renumerada, atualizar todas as referências (título e qualquer menção cruzada), não só o número.
- Não marcar nenhum checkbox como `[x]` — a entrada nasce sempre não concluída.
- Este passo termina o trabalho desta skill. A implementação em si é sempre um ciclo separado de `/nova-feature`, com sua própria branch e PR — não implementar nada aqui. Mudança isolada em `BACKLOG.md` pode ir numa branch `chore/backlog-...` própria, seguindo o padrão já usado antes.
