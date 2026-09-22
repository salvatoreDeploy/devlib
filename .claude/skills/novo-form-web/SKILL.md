---
name: novo-form-web
description: Use ao criar um formulário protegido novo em apps/web (drawer de criação ou página de edição de um recurso) que já tem rota REST pronta na API. Padroniza o esqueleto — react-hook-form + zod, cliente de API tipado, TanStack Query, layout e tokens visuais. Invoque com /novo-form-web ou ao implementar o item "Web: formulário de..."/"Web: Drawer..." do BACKLOG.md.
---

# Esqueleto de formulário protegido (apps/web)

Desde a Sprint 4 ("Fluxos de criação/detalhe migram de página pra drawer"), **criação de recurso é um drawer** (`Sheet`), não mais uma página `/<recurso>/new`. **Edição continua sendo página** (`/<recurso>/[id]/edit`) — isso não mudou.

- **Formulário de criação novo** → siga o padrão de `apps/web/components/create-project-drawer.tsx` ou `apps/web/components/create-library-drawer.tsx` (o mais parecido com o recurso novo, com/sem campo de seleção). `open`/`onOpenChange`/`onCreated` como props, `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription`/`SheetFooter` de `@/components/ui/sheet`, `onSuccess` da mutation chama `onCreated(recurso)` (fecha o drawer e invalida a query de quem o abriu) — **nunca** `router.push`, o drawer não navega.
- **Formulário de edição novo** → siga o padrão de `apps/web/app/projects/[id]/edit/page.tsx` ou `apps/web/app/libraries/[id]/edit/page.tsx` — continua página cheia, com `router.push` no sucesso.

Leia o template mais parecido com o recurso novo antes de escrever, e copie a estrutura.

## Pré-requisito

A rota REST do recurso já existe na API (ver `/nova-rota-crud`). Esta skill cobre só a camada web — cliente HTTP tipado + drawer de criação/página de edição.

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

## Página de edição (`apps/web/app/<recurso>/[id]/edit/page.tsx`)

1. Mesmo início do drawer (schema zod local, `defaultValues` explícitos), mas com `useRequireAuth()` no topo; `if (!isAuthenticated) return null`.
2. Busque o recurso com `useQuery` e popule o form via `values` (não `defaultValues`) do `useForm`, mesmo padrão de `projects/[id]/edit/page.tsx` — trate `isLoading`/`isError` antes do formulário.
3. `useMutation` chamando a função de `lib/api/<recurso>.ts`; `onSuccess` chama `router.push(...)` (geralmente a listagem do recurso, se existir).
4. Campo por campo: mesmas classes/padrão do drawer acima; erro de validação do campo abaixo dele; erro da API (`mutation.isError`) acima do botão de submit.

## Spec

Co-localizado. Casos mínimos, drawer ou página: renderiza os campos esperados; validação client-side bloqueia submit e não chama a API; submit com sucesso chama a função certa com os argumentos certos; erro da API aparece inline.

- **Drawer**: mocka só `lib/api/*` (`vi.mock`, import parcial via `vi.importActual`) — sem `next/navigation`. Renderiza com `open` fixo (`true` ou `false`) e `onOpenChange`/`onCreated` como `vi.fn()`; teste de sucesso verifica `onCreated` chamado com o recurso criado, não uma navegação. Ver `apps/web/components/create-project-drawer.spec.tsx`.
- **Página de edição**: mocka `lib/api/*` e `next/navigation` (`useRouter`). Inclui o caso "redireciona pra `/login` sem token" (só a página tem `useRequireAuth`). Ver `apps/web/app/projects/[id]/edit/page.spec.tsx`.

**Se o formulário tem um `Select` (Radix)**: `fireEvent.click` sozinho não abre o dropdown em jsdom — use `@testing-library/user-event` (`userEvent.setup()`, `await user.click(...)`) pra abrir e escolher a opção. Os polyfills necessários (`hasPointerCapture`, `scrollIntoView`, `ResizeObserver`) já estão em `apps/web/vitest.setup.ts` — não precisa readicionar.

## Depois

Siga o resto do fluxo normal de `/nova-feature` (passo 4 em diante: lint/build/test, teste manual no navegador antes de reportar concluído, `/revisar-pr`, atualizar `docs/APP.md` com a tela nova).
