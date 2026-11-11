import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_FILTERS,
  hasActiveHomeFilters,
  parseHomeFilters,
  toCatalogParams,
  toHomeSearchString,
} from "./home-libraries-filters";

describe("parseHomeFilters / toHomeSearchString", () => {
  it("lê q, category, usage, tag e page da URL", () => {
    expect(
      parseHomeFilters(
        new URLSearchParams("q=react&category=c-1&usage=unused&tag=t-1&page=4"),
      ),
    ).toEqual({
      q: "react",
      category: "c-1",
      usage: "unused",
      tag: "t-1",
      page: 4,
    });
  });

  it("sem parâmetros ou com valores inválidos devolve os padrões", () => {
    expect(parseHomeFilters(new URLSearchParams(""))).toEqual(
      DEFAULT_HOME_FILTERS,
    );
    expect(DEFAULT_HOME_FILTERS).toEqual({
      q: "",
      category: null,
      usage: null,
      tag: null,
      page: 1,
    });
    expect(parseHomeFilters(new URLSearchParams("usage=all&page=-2"))).toEqual(
      DEFAULT_HOME_FILTERS,
    );
  });

  it("escreve só o que difere do padrão; q vai como digitado", () => {
    expect(toHomeSearchString(DEFAULT_HOME_FILTERS)).toBe("");
    expect(
      toHomeSearchString({
        q: "react ",
        category: "none",
        usage: "used",
        tag: "t-1",
        page: 3,
      }),
    ).toBe("q=react+&category=none&usage=used&tag=t-1&page=3");
    expect(toHomeSearchString({ ...DEFAULT_HOME_FILTERS, q: "  " })).toBe("");
  });
});

describe("hasActiveHomeFilters", () => {
  it("página não conta; busca, categoria, uso e tag contam", () => {
    expect(hasActiveHomeFilters({ ...DEFAULT_HOME_FILTERS, page: 5 })).toBe(
      false,
    );
    for (const changes of [
      { q: "x" },
      { category: "c" },
      { usage: "used" as const },
      { tag: "t" },
    ]) {
      expect(
        hasActiveHomeFilters({ ...DEFAULT_HOME_FILTERS, ...changes }),
      ).toBe(true);
    }
  });
});

describe("toCatalogParams", () => {
  it("traduz os filtros da URL pros parâmetros da API (q com trim, só os informados)", () => {
    expect(toCatalogParams(DEFAULT_HOME_FILTERS)).toEqual({ page: 1 });
    expect(
      toCatalogParams({
        q: "  react ",
        category: "c-1",
        usage: "unused",
        tag: "t-1",
        page: 2,
      }),
    ).toEqual({
      q: "react",
      categoryId: "c-1",
      usage: "unused",
      tagId: "t-1",
      page: 2,
    });
  });
});
