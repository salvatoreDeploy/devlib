import { vi } from "vitest";

// Mock "reativo" de next/navigation pra specs de telas com estado na URL
// (busca/filtros/página): router.push/replace atualizam a query string e
// re-renderizam quem lê useSearchParams, como no Next de verdade.
//
// Uso (o vi.hoisted roda antes dos imports, por isso o import dinâmico):
//
//   const navigation = await vi.hoisted(async () => {
//     const { createNavigationMock } = await import("@/test/next-navigation-mock");
//     return createNavigationMock({ pathname: "/" });
//   });
//   vi.mock("next/navigation", () => navigation.factory());
//
//   beforeEach(() => navigation.reset());
//   navigation.setQuery("q=react&page=2"); // URL antes do render

type NavigationMockOptions = {
  pathname: string;
  params?: Record<string, string>;
};

export function createNavigationMock({
  pathname,
  params = {},
}: NavigationMockOptions) {
  let search = "";
  const listeners = new Set<() => void>();

  // query string com ou sem "?" na frente — as duas formas funcionam
  function setQuery(query: string) {
    search = query.replace(/^\?/, "");
    listeners.forEach((listener) => listener());
  }

  // URL completa, como o código passa pro router ("/", "/?page=2", ...)
  function setUrl(url: string) {
    const index = url.indexOf("?");
    setQuery(index === -1 ? "" : url.slice(index + 1));
  }

  // mesma assinatura do router do Next: (url, { scroll? })
  function navigateTo(url: string, options?: { scroll?: boolean }) {
    void options;
    setUrl(url);
  }

  const pushMock = vi.fn(navigateTo);
  const replaceMock = vi.fn(navigateTo);

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  async function factory() {
    const { useSyncExternalStore } = await import("react");
    return {
      useRouter: () => ({ push: pushMock, replace: replaceMock }),
      usePathname: () => pathname,
      useParams: () => params,
      useSearchParams: () =>
        new URLSearchParams(useSyncExternalStore(subscribe, () => search)),
    };
  }

  return {
    pushMock,
    replaceMock,
    setQuery,
    setUrl,
    getQuery: () => search,
    // URL vazia e mocks zerados (mantém a implementação que atualiza a URL)
    reset() {
      setQuery("");
      pushMock.mockClear();
      replaceMock.mockClear();
    },
    factory,
  };
}
