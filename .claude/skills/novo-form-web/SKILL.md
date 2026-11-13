---
name: novo-form-web
description: Use ao criar um formulário protegido novo em apps/web (drawer de criação ou de edição de um recurso) que já tem rota REST pronta na API. Padroniza o esqueleto — react-hook-form + zod, cliente de API tipado, TanStack Query, layout e tokens visuais. Invoque com /novo-form-web ou ao implementar o item "Web: formulário de..."/"Web: Drawer..." do BACKLOG.md.
---

# Esqueleto de formulário protegido (apps/web)

Desde a Sprint 4 ("Fluxos de criação/detalhe migram de página pra drawer"), **criação de recurso é um drawer** (`Sheet`), não mais uma página `/<recurso>/new`. Desde a Sprint 5 (2026-11-13, ver `docs/DECISIONS.md`), **edição também é drawer** — a convenção antiga "edição = página `/<recurso>/[id]/edit`" foi revertida. Não existe mais nenhuma página de edição em `apps/web`.

- **Formulário de criação novo** → siga o padrão de `apps/web/components/create-project-drawer.tsx` ou `apps/web/components/create-library-drawer.tsx` (o mais parecido com o recurso novo, com/sem campo de seleção). `open`/`onOpenChange`/`onCreated` como props, `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription`/`SheetFooter` de `@/components/ui/sheet`, `onSuccess` da mutation chama `onCreated(recurso)` (fecha o drawer e invalida a query de quem o abriu) — **nunca** `router.push`, o drawer não navega.
- **Formulário de edição novo** → drawer também. Se o recurso já tem um drawer de detalhe, a edição é um **modo** desse drawer (padrão de `apps/web/components/edit-library-form.tsx` dentro de `library-detail-drawer.tsx`: "Editar" troca o conteúdo, Cancelar/Salvar voltam pro detalhe). Se não tem, é um drawer próprio aberto de onde está o "Editar", com o mesmo esqueleto do drawer de criação (padrão de `apps/web/components/edit-project-drawer.tsx`, aberto pelo `ProjectCard`: recebe o recurso ou `null`, e o formulário com hooks só monta com o drawer aberto). **Nunca** `router.push` no sucesso.

Leia o template mais parecido com o recurso novo antes de escrever, e copie a estrutura.

## Pré-requisito

A rota REST do recurso já existe na API (ver `/nova-rota-crud`). Esta skill cobre só a camada web — cliente HTTP tipado + drawer de criação/edição.

## Cliente de API (`apps/web/lib/api/<recurso>.ts`)

Mesmo padrão de `lib/api/projects.ts`/`lib/api/libraries.ts`:

1. Tipos: `Create<Recurso>Input`, `<Recurso>` (o shape de resposta da API, datas como `string`, nunca `Date`), `Update<Recurso>Input` se houver edição.
2. Uma classe de erro por operação (`Create<Recurso>Error`, `Get<Recurso>Error`, `Update<Recurso>Error`), todas `extends Error`.
3. Uma função por operação (`create<Recurso>`, `get<Recurso>`, `update<Recurso>`), assinatura `(input, accessToken) => Promise<T>` (ou só `accessToken` pra GET), usando `fetch` direto contra `${process.env.NEXT_PUBLIC_API_URL}/<rota>`, checando `response.ok` e lançando o erro tipado com `body.error` como mensagem.
4. Spec co-localizado (`lib/api/<recurso>.spec.ts`) mockando `fetch` via `vi.stubGlobal("fetch", ...)` — ver `lib/api/projects.spec.ts`.

## Drawer de criação (`apps/web/components/create-<recurso>-drawer.tsx`)

1. `"use client"`, schema zod local (`create<Recurso>FormSchema`) com `defaultValues` explícitos pra **todo** campo — mesmo os opcionais (string vazia, não `undefined`) — evita o warning do React "changing from uncontrolled to controlled" em campos que usam `Controller` (ex: um `Select`).
2. Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onCreated: (recurso: Recurso) => void`. **Sem** `useRequireAuth()` aqui — o drawer é embutido numa tela já protegida, quem o abre já passou pela checagem.
3. Se o drawer precisa de dados auxiliares pra popular um campo (select de categoria, etc.), busque com `useQuery` (`enabled: open`, não `isAuthenticated`).
4. `useForm` com `zodResolver` + `reset` (do próprio `useForm`); `useMutation` chamando a função de `lib/api/<recurso>.ts`; `onSuccess` chama `reset()` e `onCreated(recurso)` — **nunca** `router.push`. No `onOpenChange` do `Sheet`, ao fechar (`!nextOpen`), chame `reset()` e `mutation.reset()` antes de propagar pro `onOpenChange` recebido via prop.
5. Estrutura: `Sheet`/`SheetContent` (sem `showCloseButton`) → `form` → `SheetHeader`+`SheetTitle`+`SheetDescription` → campos (`Label` + `Input`/`Textarea`/`Select`, mesmas classes de `docs/FRONTEND.md`) → erro da API (`mutation.isError`) → `SheetFooter` com Outline "Cancelar" (`SheetClose asChild`) + Primary "Salvar" (ícone `Check`, `disabled={mutation.isPending}`).
6. Se usar `Select` (Radix): envolva com `Controller` do react-hook-form, `value={field.value}` (nunca `undefined` — ver defaultValues acima).
7. Quem embute o drawer (a tela que abre) guarda o estado `open` local, renderiza `<CreateRecursoDrawer open={...} onOpenChange={...} onCreated={() => { fecha; queryClient.invalidateQueries(...) }} />` — a invalidação da lista é responsabilidade de quem abriu, não do drawer.

## Edição em drawer

1. Mesmo esqueleto do drawer de criação (schema zod local, `Controller` pro `Select`, erro da API inline), **sem** `useRequireAuth()` — quem abre já está numa tela protegida.
2. Recebe o recurso já carregado (`library`/`project`) e popula o form por `defaultValues`; o componente é montado só quando o recurso existe (e com `key={recurso.id}`), então não precisa de `values` nem de estado de carregamento próprio.
3. Props: `onCancel` e `onSaved(recursoAtualizado)` (ou `open`/`onOpenChange` quando é um drawer próprio). `onSuccess` da mutation: `setQueryData` do detalhe + invalidação de tudo que mostra o recurso (detalhe, listas, outras telas que exibem o nome) e chama `onSaved` — **nunca** `router.push`.
4. Modo dentro de um drawer de detalhe: o estado `"detail" | "edit"` vive num componente que só monta com o drawer aberto (`{recurso && open && <Corpo key={recurso.id} />}`) — fechar no meio da edição e reabrir volta no detalhe sem `useEffect` de reset. O título vem do `SheetTitle` do drawer (prop `titleAs`), porque o Radix exige um título no `Sheet`.
5. Rodapé: Outline "Cancelar" + Primary "Salvar" (ícone `Check`, `disabled={mutation.isPending}`).

## Spec

Co-localizado. Casos mínimos, drawer ou página: renderiza os campos esperados; validação client-side bloqueia submit e não chama a API; submit com sucesso chama a função certa com os argumentos certos; erro da API aparece inline.

- **Drawer**: mocka só `lib/api/*` (`vi.mock`, import parcial via `vi.importActual`) — sem `next/navigation`. Renderiza com `open` fixo (`true` ou `false`) e `onOpenChange`/`onCreated` como `vi.fn()`; teste de sucesso verifica `onCreated` chamado com o recurso criado, não uma navegação. Ver `apps/web/components/create-project-drawer.spec.tsx`.
- **Edição em drawer**: mocka só `lib/api/*`. Teste do formulário isolado (pré-preenchido, validação, sucesso chama `onSaved` + invalidações, erro inline, Cancelar sem API) e, se for modo de um drawer de detalhe, teste no drawer da troca detalhe → edição → detalhe e do "fechar e reabrir volta no detalhe". Ver `apps/web/components/edit-library-form.spec.tsx` e `library-detail-drawer.spec.tsx`.

**Se o formulário tem um `Select` (Radix)**: `fireEvent.click` sozinho não abre o dropdown em jsdom — use `@testing-library/user-event` (`userEvent.setup()`, `await user.click(...)`) pra abrir e escolher a opção. Os polyfills necessários (`hasPointerCapture`, `scrollIntoView`, `ResizeObserver`) já estão em `apps/web/vitest.setup.ts` — não precisa readicionar.

## Depois

Siga o resto do fluxo normal de `/nova-feature` (passo 4 em diante: lint/build/test, teste manual no navegador antes de reportar concluído, `/revisar-pr`, atualizar `docs/APP.md` com a tela nova).
