import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLibrary,
  CreateLibraryError,
  getLibrary,
  GetLibraryError,
  getLibraryProjects,
  GetLibraryProjectsError,
  getLibrariesCatalog,
  GetLibrariesCatalogError,
  getCatalogFacets,
  GetCatalogFacetsError,
  updateLibrary,
  UpdateLibraryError,
} from "./libraries";
import { authenticatedFetch } from "./http-client";

vi.mock("./http-client", () => ({ authenticatedFetch: vi.fn() }));

describe("createLibrary", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia o body e o método corretos e retorna a biblioteca criada", async () => {
    const library = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(library),
    } as Response);

    const result = await createLibrary({
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
    });

    expect(result).toEqual(library);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/libraries",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "drizzle-orm",
          categoryId: "category-1",
          notes: "ORM leve",
        }),
      }),
    );
  });

  it("lança CreateLibraryError com a mensagem da API quando a criação falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'Já existe uma biblioteca com o nome "drizzle-orm"',
        }),
    } as Response);

    await expect(createLibrary({ name: "drizzle-orm" })).rejects.toThrow(
      'Já existe uma biblioteca com o nome "drizzle-orm"',
    );
    await expect(createLibrary({ name: "drizzle-orm" })).rejects.toBeInstanceOf(
      CreateLibraryError,
    );
  });
});

describe("getLibrary", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna a biblioteca", async () => {
    const library = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(library),
    } as Response);

    const result = await getLibrary("library-1");

    expect(result).toEqual(library);
    expect(authenticatedFetch).toHaveBeenCalledWith("/libraries/library-1");
  });

  it("lança GetLibraryError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Biblioteca não encontrada" }),
    } as Response);

    await expect(getLibrary("library-1")).rejects.toThrow(
      "Biblioteca não encontrada",
    );
    await expect(getLibrary("library-1")).rejects.toBeInstanceOf(
      GetLibraryError,
    );
  });
});

describe("updateLibrary", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia PATCH com o body correto e retorna a biblioteca atualizada", async () => {
    const library = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(library),
    } as Response);

    const result = await updateLibrary("library-1", {
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
    });

    expect(result).toEqual(library);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/libraries/library-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "drizzle-orm",
          categoryId: "category-1",
          notes: "ORM leve",
        }),
      }),
    );
  });

  it("lança UpdateLibraryError com a mensagem da API quando a atualização falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'Já existe uma biblioteca com o nome "drizzle-orm"',
        }),
    } as Response);

    await expect(
      updateLibrary("library-1", { name: "drizzle-orm" }),
    ).rejects.toThrow('Já existe uma biblioteca com o nome "drizzle-orm"');
    await expect(
      updateLibrary("library-1", { name: "drizzle-orm" }),
    ).rejects.toBeInstanceOf(UpdateLibraryError);
  });
});

describe("getLibraryProjects", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna os projetos que usam a biblioteca", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      version: "1.2.3",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([project]),
    } as Response);

    const result = await getLibraryProjects("library-1");

    expect(result).toEqual([project]);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/libraries/library-1/projects",
    );
  });

  it("retorna array vazio quando nenhum projeto usa a biblioteca", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    const result = await getLibraryProjects("library-1");

    expect(result).toEqual([]);
  });

  it("lança GetLibraryProjectsError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Biblioteca não encontrada" }),
    } as Response);

    await expect(getLibraryProjects("library-x")).rejects.toThrow(
      "Biblioteca não encontrada",
    );
    await expect(getLibraryProjects("library-x")).rejects.toBeInstanceOf(
      GetLibraryProjectsError,
    );
  });
});

describe("getLibrariesCatalog", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  const page = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  };

  it("sem parâmetros chama /libraries/catalog sem query string", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(page),
    } as Response);

    const result = await getLibrariesCatalog({});

    expect(result).toEqual(page);
    expect(authenticatedFetch).toHaveBeenCalledWith("/libraries/catalog");
  });

  it("monta a query só com os parâmetros informados", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(page),
    } as Response);

    await getLibrariesCatalog({
      q: "react query",
      categoryId: "none",
      usage: "used",
      tagId: "tag-1",
      page: 2,
    });

    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/libraries/catalog?q=react+query&categoryId=none&usage=used&tagId=tag-1&page=2",
    );
  });

  it("lança GetLibrariesCatalogError com a mensagem da API", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Erro de validação" }),
    } as Response);

    await expect(getLibrariesCatalog({})).rejects.toThrow("Erro de validação");
    await expect(getLibrariesCatalog({})).rejects.toBeInstanceOf(
      GetLibrariesCatalogError,
    );
  });
});

describe("getCatalogFacets", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("busca as opções de filtro do catálogo", async () => {
    const facets = {
      categories: [
        { id: "c-1", name: "Frontend", projectId: null, projectName: null },
      ],
      hasUncategorized: false,
      tags: [{ id: "t-1", name: "ui" }],
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(facets),
    } as Response);

    expect(await getCatalogFacets()).toEqual(facets);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/libraries/catalog/facets",
    );
  });

  it("lança GetCatalogFacetsError com mensagem padrão quando a API não devolve error", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(getCatalogFacets()).rejects.toBeInstanceOf(
      GetCatalogFacetsError,
    );
  });
});
