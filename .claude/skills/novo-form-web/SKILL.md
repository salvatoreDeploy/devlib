---
name: novo-form-web
description: Use ao criar um formulário protegido novo em apps/web (criação ou edição de um recurso) que já tem rota REST pronta na API. Padroniza o esqueleto — useRequireAuth, react-hook-form + zod, cliente de API tipado, TanStack Query, layout e tokens visuais. Invoque com /novo-form-web ou ao implementar o item "Web: formulário de..." do BACKLOG.md.
---

# Esqueleto de formulário protegido (apps/web)

O projeto já tem três formulários seguindo exatamente o mesmo formato: `apps/web/app/projects/new/page.tsx`, `apps/web/app/projects/[id]/edit/page.tsx` e `apps/web/app/libraries/new/page.tsx`. Leia os que existirem mais parecidos com o recurso novo (criação vs edição, com ou sem campo de seleção) antes de escrever, e copie a estrutura.

## Pré-requisito

A rota REST do recurso já existe na API (ver `/nova-rota-crud`). Esta skill cobre só a camada web — cliente HTTP tipado + página de formulário.

## Cliente de API (`apps/web/lib/api/<recurso>.ts`)

Mesmo padrão de `lib/api/projects.ts`/`lib/api/libraries.ts`:

1. Tipos: `Create<Recurso>Input`, `<Recurso>` (o shape de resposta da API, datas como `string`, nunca `Date`), `Update<Recurso>Input` se houver edição.
2. Uma classe de erro por operação (`Create<Recurso>Error`, `Get<Recurso>Error`, `Update<Recurso>Error`), todas `extends Error`.
3. Uma função por operação (`create<Recurso>`, `get<Recurso>`, `update<Recurso>`), assinatura `(input, accessToken) => Promise<T>` (ou só `accessToken` pra GET), usando `fetch` direto contra `${process.env.NEXT_PUBLIC_API_URL}/<rota>`, checando `response.ok` e lançando o erro tipado com `body.error` como mensagem.
4. Spec co-localizado (`lib/api/<recurso>.spec.ts`) mockando `fetch` via `vi.stubGlobal("fetch", ...)` — ver `lib/api/projects.spec.ts`.

## Página (`apps/web/app/<recurso>/new/page.tsx` ou `.../[id]/edit/page.tsx`)

1. `"use client"`, schema zod local (`new<Recurso>FormSchema`) com `defaultValues` explícitos pra **todo** campo — mesmo os opcionais (string vazia, não `undefined`) — evita o warning do React "changing from uncontrolled to controlled" em campos que usam `Controller` (ex: um `Select`).
2. `useRequireAuth()` no topo; `if (!isAuthenticated) return null`.
3. Se a página precisa de dados auxiliares pra popular um campo (select de categoria, etc.), busque com `useQuery` (`enabled: isAuthenticated`), nunca no `mount` direto.
4. Se a página é de edição, busque o recurso com `useQuery` e popule o form via `values` (não `defaultValues`) do `useForm`, mesmo padrão de `projects/[id]/edit/page.tsx` — trate `isLoading`/`isError` antes do formulário.
5. `useForm` com `zodResolver`; `useMutation` chamando a função de `lib/api/<recurso>.ts`, passando `getAccessToken() ?? ""`; `onSuccess` chama `router.push(...)` (geralmente `/`, a menos que já exista uma tela de listagem do recurso).
6. Campo por campo: `Label` + `Input`/`Textarea`/`Select` (shadcn) com as classes de `docs/FRONTEND.md` (`h-10 rounded-lg border-input bg-surface-input px-3 text-[13.5px] text-foreground`; textarea `h-[76px] resize-none`); erro de validação do campo abaixo dele; erro da API (`mutation.isError`) acima do botão de submit.
7. Se usar `Select` (Radix): envolva com `Controller` do react-hook-form, `value={field.value}` (nunca `undefined` — ver defaultValues acima).

## Spec da página

Co-localizado, mockando o(s) módulo(s) de `lib/api/*` com `vi.mock` (import parcial via `vi.importActual`) e `next/navigation` (`useRouter`). Casos mínimos: redireciona pra `/login` sem token; renderiza os campos esperados; validação client-side bloqueia submit e não chama a API; submit com sucesso chama a função certa com os argumentos certos e redireciona; erro da API aparece inline.

**Se a página tem um `Select` (Radix)**: `fireEvent.click` sozinho não abre o dropdown em jsdom — use `@testing-library/user-event` (`userEvent.setup()`, `await user.click(...)`) pra abrir e escolher a opção. Os polyfills necessários (`hasPointerCapture`, `scrollIntoView`, `ResizeObserver`) já estão em `apps/web/vitest.setup.ts` — não precisa readicionar.

## Depois

Siga o resto do fluxo normal de `/nova-feature` (passo 4 em diante: lint/build/test, teste manual no navegador antes de reportar concluído, `/revisar-pr`, atualizar `docs/APP.md` com a tela nova).
