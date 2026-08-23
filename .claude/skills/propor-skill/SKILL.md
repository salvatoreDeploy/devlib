---
name: propor-skill
description: Use quando perceber um padrão que se repete — a mesma sequência de passos, a mesma checagem manual, o mesmo tipo de correção — em mais de uma tarefa do projeto. Propõe criar uma nova skill, subagente ou hook para automatizar isso, mas nunca cria o arquivo sem aprovação explícita.
---

# Propor uma nova skill, subagente ou hook

Ao perceber que uma sequência de ações se repetiu — por exemplo, a mesma correção manual em duas tarefas, ou os mesmos passos pra configurar algo em mais de uma feature — pare e avalie, em vez de simplesmente repetir de novo:

## 1. Nomear o padrão

Descreva o que se repetiu em 1-2 frases. Se não conseguir descrever de forma simples, provavelmente ainda não repetiu vezes suficientes pra valer a pena automatizar.

## 2. Escolher o mecanismo certo

- **Skill** (`.claude/skills/`) — se é um workflow ou procedimento que o agente deveria saber executar quando a tarefa combinar com ele
- **Hook** (`.claude/settings.json`) — se é uma regra que precisa valer sempre, sem depender do agente lembrar (ex: formatar automaticamente, bloquear um padrão perigoso)
- **Subagente** (`.claude/agents/`) — se é uma verificação isolada, que não deveria ter permissão de editar nada, só relatar

## 3. Apresentar a proposta — PARE E PEÇA APROVAÇÃO

Mostrar ao humano:
- O padrão observado (com exemplo de onde ele apareceu)
- O mecanismo sugerido e por quê
- Um rascunho do conteúdo do arquivo

Nunca criar o arquivo antes de um "sim" explícito — mesmo que a proposta pareça óbvia.

## 4. Depois de aprovado

- Criar o arquivo no lugar certo
- Adicionar uma linha em `CLAUDE.md`, na seção "Skills e subagentes disponíveis", pra ficar descoberto em sessões futuras
- Se a automação nasceu de uma decisão não óbvia, registrar também em `docs/DECISIONS.md`
