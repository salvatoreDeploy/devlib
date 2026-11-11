import { describe, expect, it, vi } from "vitest";
import {
  CATALOG_PAGE_SIZE,
  getCatalogFacets,
  listLibrariesCatalog,
  type LibrariesCatalogRepository,
} from "./libraries-catalog.service";

const date = new Date("2026-11-11T00:00:00Z");

function library(name: string, projectsCount = 0) {
  return {
    id: `library-${name}`,
    name,
    categoryId: null,
    notes: null,
    createdAt: date,
    updatedAt: date,
    projectsCount,
  };
}

function fakeRepository(
  overrides: Partial<LibrariesCatalogRepository> = {},
): LibrariesCatalogRepository {
  return {
    findLibrariesCatalog: vi
      .fn()
      .mockResolvedValue({ items: [library("react", 1)], total: 1 }),
    findEffectiveCategories: vi.fn().mockResolvedValue([]),
    findCatalogFacets: vi.fn().mockResolvedValue({
      categories: [],
      hasUncategorized: false,
      tags: [],
    }),
    ...overrides,
  };
}

const filters = { usage: "all" as const };

describe("listLibrariesCatalog", () => {
  it("busca a página pedida com limite de 10 e offset correspondente, repassando filtros e usuário", async () => {
    const repository = fakeRepository({
      findLibrariesCatalog: vi
        .fn()
        .mockResolvedValue({ items: [library("react", 1)], total: 25 }),
    });

    const result = await listLibrariesCatalog(repository, "user-1", {
      filters: { q: "re", usage: "used", tagId: "tag-1" },
      page: 2,
    });

    expect(CATALOG_PAGE_SIZE).toBe(10);
    expect(repository.findLibrariesCatalog).toHaveBeenCalledWith(
      "user-1",
      { q: "re", usage: "used", tagId: "tag-1" },
      { limit: 10, offset: 10 },
    );
    expect(result).toMatchObject({ total: 25, page: 2, pageSize: 10 });
  });

  it("página além da última é ajustada: busca de novo a última página e devolve o page efetivo", async () => {
    const findLibrariesCatalog = vi
      .fn()
      .mockResolvedValueOnce({ items: [], total: 23 })
      .mockResolvedValueOnce({ items: [library("zod")], total: 23 });
    const repository = fakeRepository({ findLibrariesCatalog });

    const result = await listLibrariesCatalog(repository, "user-1", {
      filters,
      page: 9,
    });

    expect(findLibrariesCatalog).toHaveBeenCalledTimes(2);
    expect(findLibrariesCatalog).toHaveBeenLastCalledWith("user-1", filters, {
      limit: 10,
      offset: 20,
    });
    expect(result.page).toBe(3);
    expect(result.items.map((item) => item.name)).toEqual(["zod"]);
  });

  it("sem resultado: page 1, total 0, sem consultar categorias efetivas", async () => {
    const repository = fakeRepository({
      findLibrariesCatalog: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    });

    const result = await listLibrariesCatalog(repository, "user-1", {
      filters,
      page: 4,
    });

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(repository.findLibrariesCatalog).toHaveBeenCalledOnce();
    expect(repository.findEffectiveCategories).not.toHaveBeenCalled();
  });

  it("anexa as categorias efetivas de cada biblioteca da página, agrupando projetos por categoria (ordenados por nome)", async () => {
    const repository = fakeRepository({
      findLibrariesCatalog: vi.fn().mockResolvedValue({
        items: [library("react", 3), library("zod", 0)],
        total: 2,
      }),
      findEffectiveCategories: vi.fn().mockResolvedValue([
        {
          libraryId: "library-react",
          categoryId: "cat-front",
          categoryName: "Frontend",
          projectId: "p-2",
          projectName: "Zeta",
        },
        {
          libraryId: "library-react",
          categoryId: "cat-ui",
          categoryName: "UI",
          projectId: "p-3",
          projectName: "Beta",
        },
        {
          libraryId: "library-react",
          categoryId: "cat-front",
          categoryName: "Frontend",
          projectId: "p-1",
          projectName: "Alfa",
        },
      ]),
    });

    const result = await listLibrariesCatalog(repository, "user-1", {
      filters,
      page: 1,
    });

    expect(repository.findEffectiveCategories).toHaveBeenCalledWith("user-1", [
      "library-react",
      "library-zod",
    ]);
    expect(result.items[0].effectiveCategories).toEqual([
      {
        id: "cat-front",
        name: "Frontend",
        projects: [
          { id: "p-1", name: "Alfa" },
          { id: "p-2", name: "Zeta" },
        ],
      },
      { id: "cat-ui", name: "UI", projects: [{ id: "p-3", name: "Beta" }] },
    ]);
    // não usada pelo usuário: lista vazia (a Home mostra a categoria global)
    expect(result.items[1].effectiveCategories).toEqual([]);
  });

  it("projetos sem categoria efetiva (nem do projeto nem global) viram uma entrada id null, por último", async () => {
    const repository = fakeRepository({
      findEffectiveCategories: vi.fn().mockResolvedValue([
        {
          libraryId: "library-react",
          categoryId: null,
          categoryName: null,
          projectId: "p-2",
          projectName: "Beta",
        },
        {
          libraryId: "library-react",
          categoryId: "cat-front",
          categoryName: "Frontend",
          projectId: "p-1",
          projectName: "Alfa",
        },
      ]),
    });

    const result = await listLibrariesCatalog(repository, "user-1", {
      filters,
      page: 1,
    });

    expect(result.items[0].effectiveCategories).toEqual([
      {
        id: "cat-front",
        name: "Frontend",
        projects: [{ id: "p-1", name: "Alfa" }],
      },
      { id: null, name: null, projects: [{ id: "p-2", name: "Beta" }] },
    ]);
  });
});

describe("getCatalogFacets", () => {
  it("ordena as categorias: globais por nome, depois as de projeto por projeto e nome; tags por nome", async () => {
    const repository = fakeRepository({
      findCatalogFacets: vi.fn().mockResolvedValue({
        categories: [
          {
            id: "c-estado",
            name: "Estado",
            projectId: "p-b",
            projectName: "Beta",
          },
          { id: "c-orm", name: "ORM", projectId: null, projectName: null },
          {
            id: "c-infra",
            name: "Infra",
            projectId: "p-a",
            projectName: "Alfa",
          },
          {
            id: "c-front",
            name: "Frontend",
            projectId: null,
            projectName: null,
          },
          { id: "c-api", name: "API", projectId: "p-a", projectName: "Alfa" },
        ],
        hasUncategorized: true,
        tags: [
          { id: "t-ui", name: "ui" },
          { id: "t-auth", name: "Auth" },
        ],
      }),
    });

    const facets = await getCatalogFacets(repository, "user-1");

    expect(repository.findCatalogFacets).toHaveBeenCalledWith("user-1");
    expect(facets.categories.map((category) => category.id)).toEqual([
      "c-front",
      "c-orm",
      "c-api",
      "c-infra",
      "c-estado",
    ]);
    expect(facets.hasUncategorized).toBe(true);
    expect(facets.tags.map((tag) => tag.name)).toEqual(["Auth", "ui"]);
  });
});
