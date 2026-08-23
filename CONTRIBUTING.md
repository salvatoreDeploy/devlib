# Contribuindo com o DevLib

Este repositório é desenvolvido com apoio de agentes de IA (Claude Code), com revisão e aprovação humana obrigatória via pull request. Este guia define como isso funciona na prática.

## Fluxo de branches (git flow)

- `main` — sempre em produção. Só recebe merge de `release/*` ou `hotfix/*`.
- `develop` — branch de integração. Todo `feature/*` nasce e volta pra cá.
- `feature/<escopo>-<descrição>` — ex: `feature/api-cadastro-biblioteca`, `feature/web-dashboard-metricas`.
- `release/<versão>` — preparação de uma entrega para produção.
- `hotfix/<descrição>` — correção urgente direto em produção.

## Antes de abrir o PR

- [ ] Rodei `turbo run lint` e `turbo run build` localmente (ou confio no Harness pra isso)
- [ ] Adicionei/atualizei testes para a mudança
- [ ] Se mudei `packages/db/schema.ts`, gerei a migration correspondente

## Checklist de aprovação (revisão humana)

**Automático — Harness bloqueia o merge se falhar**
- [ ] Build passa (`turbo run build --filter=...`)
- [ ] Lint sem erros
- [ ] Testes automatizados passam
- [ ] Type-check sem erros

**Revisão manual**
- [ ] O PR está restrito ao escopo do nome da branch (ex: `feature/api-*` só mexe em `apps/api`)
- [ ] Segue a estrutura de pastas descrita em `CLAUDE.md`
- [ ] Rotas novas têm validação de entrada (zod) e tratamento de erro
- [ ] Nenhum segredo ou chave commitado
- [ ] Mudança de schema vem com migration incluída
- [ ] Descrição do PR explica o quê e por quê, não só o quê
- [ ] Mudança de UI vem com print ou gif da tela
- [ ] Nenhum breaking change em rota existente sem aviso explícito na descrição do PR

Um PR só é aprovado quando todos os itens acima estão marcados. Se algum item falhar, o PR volta para ajuste antes de nova revisão.

## Padrão de commits

Commits seguem o formato `tipo(escopo): descrição`, por exemplo:

```
feat(api): adiciona rota de cadastro de biblioteca
fix(web): corrige contagem de bibliotecas no dashboard
chore(db): adiciona migration para campo role em users
```

Tipos aceitos: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`.
