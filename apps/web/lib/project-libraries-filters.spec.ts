import { describe, expect, it } from "vitest";
import {
  applyFilters,
  categoryOptions,
  DEFAULT_FILTERS,
  hasActiveFilters,
  NO_CATEGORY,
  PAGE_SIZE,
  parseFilters,
  toSearchString,
} from "./project-libraries-filters";
import type { ProjectLibrary } from "./api/projects";

function lib(
  name: string,
  extra: Partial<ProjectLibrary> = {},
): ProjectLibrary {
  return {
    id: `library-${name}`,
    name,
    categoryId: null,
    notes: null,
    version: "1.0.0",
    projectCategoryId: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...extra,
  };
}

describe("parseFilters / toSearchString", () => {
  it("lê q, category, version e page da URL", () => {
    expect(
      parseFilters(
        new URLSearchParams("q=react&category=cat-1&version=without&page=3"),
      ),
    ).toEqual({ q: "react", category: "cat-1", version: "without", page: 3 });
  });

  it("sem parâmetros devolve os padrões", () => {
    expect(parseFilters(new URLSearchParams(""))).toEqual(DEFAULT_FILTERS);
    expect(DEFAULT_FILTERS).toEqual({
      q: "",
      category: null,
      version: null,
      page: 1,
    });
  });

  it("ignora valores inválidos (version desconhecida, page não inteira ou < 1)", () => {
    expect(
      parseFilters(new URLSearchParams("version=talvez&page=abc")),
    ).toEqual(DEFAULT_FILTERS);
    expect(parseFilters(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseFilters(new URLSearchParams("page=2.5")).page).toBe(1);
  });

  it("escreve só o que difere do padrão, na ordem q, category, version, page", () => {
    expect(toSearchString(DEFAULT_FILTERS)).toBe("");
    expect(
      toSearchString({
        q: "react query",
        category: NO_CATEGORY,
        version: "with",
        page: 2,
      }),
    ).toBe("q=react+query&category=none&version=with&page=2");
    expect(toSearchString({ ...DEFAULT_FILTERS, q: "  " })).toBe("");
  });

  it("mantém o espaço no fim da busca, pra continuar digitando a segunda palavra", () => {
    const search = toSearchString({ ...DEFAULT_FILTERS, q: "react " });

    expect(parseFilters(new URLSearchParams(search)).q).toBe("react ");
  });
});

describe("hasActiveFilters", () => {
  it("página não conta como filtro", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, page: 3 })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, q: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, category: "c" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, version: "with" })).toBe(
      true,
    );
  });
});

describe("categoryOptions", () => {
  const names = new Map([
    ["cat-front", "Frontend"],
    ["cat-orm", "ORM"],
    ["cat-own", "Estado"],
  ]);

  it("lista só as categorias efetivas presentes no projeto, por nome, e 'Sem categoria' por último", () => {
    const libraries = [
      lib("react", { categoryId: "cat-front" }),
      // categoria do projeto vence a global
      lib("zustand", { categoryId: "cat-front", projectCategoryId: "cat-own" }),
      lib("drizzle-orm", { categoryId: "cat-orm" }),
      lib("zod"),
    ];

    expect(categoryOptions(libraries, names)).toEqual([
      { value: "cat-own", label: "Estado" },
      { value: "cat-front", label: "Frontend" },
      { value: "cat-orm", label: "ORM" },
      { value: NO_CATEGORY, label: "Sem categoria" },
    ]);
  });

  it("sem lib sem categoria, não oferece 'Sem categoria'; nome ainda não carregado vira 'Categoria'", () => {
    expect(
      categoryOptions([lib("x", { categoryId: "cat-desconhecida" })], names),
    ).toEqual([{ value: "cat-desconhecida", label: "Categoria" }]);
  });
});

describe("applyFilters", () => {
  const libraries = [
    lib("zod", { categoryId: "cat-val" }),
    lib("@tanstack/react-query", { categoryId: "cat-front", version: null }),
    lib("react", { categoryId: "cat-front" }),
    lib("Validação-utils"),
    lib("drizzle-orm", { projectCategoryId: "cat-orm" }),
  ];

  it("ordena por nome A→Z ignorando maiúsculas e acentos (pacote com @escopo vem antes das letras)", () => {
    const result = applyFilters(libraries, DEFAULT_FILTERS);

    expect(result.items.map((item) => item.name)).toEqual([
      "@tanstack/react-query",
      "drizzle-orm",
      "react",
      "Validação-utils",
      "zod",
    ]);
  });

  it("busca por trecho do nome, sem maiúsculas nem acentos", () => {
    expect(
      applyFilters(libraries, { ...DEFAULT_FILTERS, q: "REACT" }).items.map(
        (item) => item.name,
      ),
    ).toEqual(["@tanstack/react-query", "react"]);
    expect(
      applyFilters(libraries, { ...DEFAULT_FILTERS, q: "validacao" }).total,
    ).toBe(1);
  });

  it("filtra pela categoria efetiva (projeto vence global) e por 'Sem categoria'", () => {
    expect(
      applyFilters(libraries, {
        ...DEFAULT_FILTERS,
        category: "cat-front",
      }).items.map((item) => item.name),
    ).toEqual(["@tanstack/react-query", "react"]);
    expect(
      applyFilters(libraries, { ...DEFAULT_FILTERS, category: "cat-orm" })
        .total,
    ).toBe(1);
    expect(
      applyFilters(libraries, {
        ...DEFAULT_FILTERS,
        category: NO_CATEGORY,
      }).items.map((item) => item.name),
    ).toEqual(["Validação-utils"]);
  });

  it("filtra com/sem versão", () => {
    expect(
      applyFilters(libraries, {
        ...DEFAULT_FILTERS,
        version: "without",
      }).items.map((item) => item.name),
    ).toEqual(["@tanstack/react-query"]);
    expect(
      applyFilters(libraries, { ...DEFAULT_FILTERS, version: "with" }).total,
    ).toBe(4);
  });

  it("combina os filtros", () => {
    expect(
      applyFilters(libraries, {
        q: "react",
        category: "cat-front",
        version: "with",
        page: 1,
      }).items.map((item) => item.name),
    ).toEqual(["react"]);
  });

  it(`pagina de ${PAGE_SIZE} em ${PAGE_SIZE}, com intervalo e total de páginas`, () => {
    const many = Array.from({ length: 23 }, (_, i) =>
      lib(`lib-${String(i).padStart(2, "0")}`),
    );

    const page1 = applyFilters(many, DEFAULT_FILTERS);
    const page3 = applyFilters(many, { ...DEFAULT_FILTERS, page: 3 });

    expect(PAGE_SIZE).toBe(10);
    expect(page1).toMatchObject({
      total: 23,
      page: 1,
      pageCount: 3,
      start: 1,
      end: 10,
    });
    expect(page1.items).toHaveLength(10);
    expect(page3).toMatchObject({ page: 3, start: 21, end: 23 });
    expect(page3.items.map((item) => item.name)).toEqual([
      "lib-20",
      "lib-21",
      "lib-22",
    ]);
  });

  it("página além da última é ajustada para a última", () => {
    const result = applyFilters(libraries, { ...DEFAULT_FILTERS, page: 9 });

    expect(result).toMatchObject({ page: 1, pageCount: 1, start: 1, end: 5 });
  });

  it("sem resultado: total 0, página 1 de 1 e intervalo vazio", () => {
    expect(
      applyFilters(libraries, { ...DEFAULT_FILTERS, q: "inexistente" }),
    ).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageCount: 1,
      start: 0,
      end: 0,
    });
  });
});
