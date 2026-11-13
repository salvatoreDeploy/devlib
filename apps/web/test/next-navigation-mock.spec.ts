import { describe, expect, it } from "vitest";
import { createNavigationMock } from "./next-navigation-mock";

describe("createNavigationMock", () => {
  it("setQuery aceita a query com ou sem '?'", () => {
    const navigation = createNavigationMock({ pathname: "/" });

    navigation.setQuery("q=react");
    expect(navigation.getQuery()).toBe("q=react");

    navigation.setQuery("?page=2");
    expect(navigation.getQuery()).toBe("page=2");
  });

  it("setUrl, push e replace extraem a query da URL completa", () => {
    const navigation = createNavigationMock({ pathname: "/projects/p-1" });

    navigation.setUrl("/projects/p-1?q=zod");
    expect(navigation.getQuery()).toBe("q=zod");

    navigation.pushMock("/projects/p-1?page=3", { scroll: false });
    expect(navigation.getQuery()).toBe("page=3");

    navigation.replaceMock("/projects/p-1");
    expect(navigation.getQuery()).toBe("");
  });

  it("reset limpa a URL e as chamadas, mas push/replace continuam atualizando a URL", () => {
    const navigation = createNavigationMock({ pathname: "/" });
    navigation.pushMock("/?page=2");

    navigation.reset();

    expect(navigation.getQuery()).toBe("");
    expect(navigation.pushMock).not.toHaveBeenCalled();
    navigation.replaceMock("/?q=x");
    expect(navigation.getQuery()).toBe("q=x");
  });

  it("a factory expõe useRouter, usePathname, useParams e useSearchParams", async () => {
    const navigation = createNavigationMock({
      pathname: "/projects/p-1",
      params: { id: "p-1" },
    });

    const mod = await navigation.factory();

    expect(mod.usePathname()).toBe("/projects/p-1");
    expect(mod.useParams()).toEqual({ id: "p-1" });
    expect(mod.useRouter().push).toBe(navigation.pushMock);
    expect(mod.useRouter().replace).toBe(navigation.replaceMock);
  });
});
