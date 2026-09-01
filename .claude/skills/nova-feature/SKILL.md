---
name: nova-feature
description: Use ao implementar um item do backlog do DevLib (BACKLOG.md), do planejamento ao PR, em ciclos curtos com pontos de aprovação humana obrigatórios e testes escritos antes da implementação. Invoque com /nova-feature ou peça "implementa o próximo item do sprint X".
---

# Ciclo de uma tarefa — do backlog ao PR

Este é o fluxo padrão para qualquer item do backlog. Ele tem paradas obrigatórias — não pule nenhuma, mesmo que a tarefa pareça simples ou óbvia.

## 0. Escolher e recortar a tarefa

- Leia o item exato em `BACKLOG.md`. Se o pedido for vago ("implementa a próxima coisa"), pegue o primeiro item não marcado do sprint em andamento — não pule pra outro sprint.
- Se o item for grande demais pra caber num PR pequeno e revisável, quebre-o em subtarefas e liste todas antes de começar a primeira. Prefira sempre a menor fatia que já entrega algo testável sozinho.

## 1. Plano — PARE E PEÇA APROVAÇÃO

Antes de escrever qualquer código ou teste, apresente um plano curto:
- O que vai ser feito, em poucas linhas
- Quais arquivos serão criados ou alterados
- Qualquer decisão de design que não esteja já óbvia em `CLAUDE.md`

Pergunte explicitamente se pode seguir. **Não escreva nenhum arquivo antes da aprovação deste plano.**

## 2. Specs primeiro

- Escreva o(s) arquivo(s) `.spec.ts` co-localizados **antes** da implementação, descrevendo o comportamento esperado (nome do arquivo ao lado do que será testado, ex: `library.service.spec.ts` ao lado de `library.service.ts`).
- Mostre as specs escritas e pergunte se cobrem o que era esperado, antes de implementar — é mais barato ajustar um teste agora do que reescrever a implementação depois.
- Rode as specs e confirme que falham por falta de implementação (não por erro de sintaxe do teste) — isso prova que o teste testa algo real.

## 3. Implementação

- Implemente o necessário pra fazer as specs passarem, seguindo as convenções de `CLAUDE.md` (estrutura de pastas, validação zod em rotas, providers isolados, nunca acessar banco do frontend).
- Se durante a implementação surgir uma decisão não coberta no plano do passo 1, pare e pergunte — não decida silenciosamente e siga em frente.
- Se a tarefa envolver uma tela ou componente novo em apps/web, consultar docs/FRONTEND.md antes de estilizar — os padrões visuais (densidade, cores de badge, formato de tabela/lista) já foram decididos, não redesenhar do zero.

## 4. Fluxo de testes completo

Rodar, nesta ordem, com o filtro do escopo certo:

```
turbo run lint --filter=<api|web>...
turbo run build --filter=<api|web>...
turbo run test --filter=<api|web>...
```

Todos precisam passar antes de seguir. Corrigir e rodar de novo se algo falhar — nunca avançar com teste quebrado "pra ver depois".

## 5. Autorrevisão

Invoque a skill `revisar-pr` e responda item por item do checklist de `CONTRIBUTING.md`, explicitamente, antes de seguir.

## 5.5. Documentar

- Se a tarefa envolveu uma decisão não óbvia (escolha entre alternativas, trade-off), registre em `docs/DECISIONS.md` antes de seguir.
- Se a tarefa entregou ou mudou uma funcionalidade, rota ou tela, atualize `docs/APP.md` na seção correspondente.
- Se durante a tarefa você percebeu que repetiu um padrão já visto em outra tarefa anterior, invoque `propor-skill` antes de finalizar.

## 6. PARE E PEÇA APROVAÇÃO PARA ABRIR O PR

Mostre um resumo final: o que foi feito, resultado dos testes (todos passando), e a descrição do PR já pronta no formato do template. Só abrir o PR (`gh pr create`) depois de um "sim" explícito — nunca abrir PR sozinho, mesmo com tudo verde.

## 7. Depois do PR

Não marcar o item como concluído em `BACKLOG.md` até o PR ser de fato aprovado e mesclado pelo humano — marcar antes disso é otimismo, não fato.
