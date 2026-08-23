---
name: revisar-pr
description: Use antes de abrir um Pull Request no DevLib, para se autoavaliar contra o checklist de CONTRIBUTING.md antes de pedir revisão humana. Invoque com /revisar-pr ao terminar uma implementação.
---

# Autorrevisão antes do PR

Antes de sugerir abrir um Pull Request, faça o seguinte — nesta ordem:

1. Rode `git diff develop...HEAD` e releia o diff inteiro, não só os arquivos que você lembra de ter mexido.
2. Percorra cada item do checklist em `CONTRIBUTING.md` e responda explicitamente sim/não para cada um, em voz alta (na resposta), não só mentalmente:
   - Segue a estrutura de pastas do `CLAUDE.md`?
   - Rotas novas têm validação zod e tratamento de erro?
   - Todo arquivo novo em routes/services/providers tem seu `.spec.ts` co-localizado?
   - Nenhum segredo commitado?
   - Mudança de schema tem migration?
   - Nenhum breaking change silencioso em rota existente?
3. Se qualquer item for "não", corrija antes de prosseguir. Não abra o PR com pendência conhecida — isso só transfere trabalho de revisão para o humano que poderia ter sido feito agora.
4. Escreva a descrição do PR já no formato do template (`.github/PULL_REQUEST_TEMPLATE.md`): o quê, por quê, breaking changes (ou "nenhum" explícito), e print/gif se houve mudança de UI.
5. Só então informe que está pronto para abrir o PR, ou rode `gh pr create` se tiver permissão para isso.

Nunca pule o passo 2 achando que "já sei que está tudo certo" — o valor desta skill é justamente forçar a checagem explícita, item por item.
