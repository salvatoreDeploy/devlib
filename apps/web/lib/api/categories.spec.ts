import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCategories,
  GetCategoriesError,
  getProjectCategories,
  GetProjectCategoriesError,
  deleteProjectCategory,
  DeleteProjectCategoryError,
} from "./categories";
import { authenticatedFetch } from "./http-client";

vi.mock("./http-client", () => ({ authenticatedFetch: vi.fn() }));

describe("getCategories", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna as categorias", async () => {
    const categories = [
      {
        id: "category-1",
        projectId: null,
        name: "Frontend",
        createdAt: "2026-09-03T00:00:00.000Z",
      },
    ];
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(categories),
    } as Response);

    const result = await getCategories();

    expect(result).toEqual(categories);
    expect(authenticatedFetch).toHaveBeenCalledWith("/categories");
  });

  it("lança GetCategoriesError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Não autorizado" }),
    } as Response);

    await expect(getCategories()).rejects.toThrow("Não autorizado");
    await expect(getCategories()).rejects.toBeInstanceOf(GetCategoriesError);
  });
});

describe("getProjectCategories", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna as categorias globais e as do projeto", async () => {
    const categories = [
      {
        id: "category-1",
        projectId: null,
        name: "Frontend",
        createdAt: "2026-09-03T00:00:00.000Z",
      },
      {
        id: "category-2",
        projectId: "project-1",
        name: "Infra interna",
        createdAt: "2026-09-03T00:00:00.000Z",
      },
    ];
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(categories),
    } as Response);

    const result = await getProjectCategories("project-1");

    expect(result).toEqual(categories);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1/categories",
    );
  });

  it("lança GetProjectCategoriesError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Projeto não encontrado" }),
    } as Response);

    await expect(getProjectCategories("project-x")).rejects.toThrow(
      "Projeto não encontrado",
    );
    await expect(getProjectCategories("project-x")).rejects.toBeInstanceOf(
      GetProjectCategoriesError,
    );
  });
});

describe("deleteProjectCategory", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia o método DELETE, sem ler corpo quando a resposta é 204", async () => {
    const jsonMock = vi.fn();
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      status: 204,
      json: jsonMock,
    } as unknown as Response);

    await expect(
      deleteProjectCategory("project-1", "category-2"),
    ).resolves.toBeUndefined();

    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1/categories/category-2",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("lança DeleteProjectCategoryError com a mensagem da API quando a exclusão falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Categoria não encontrada" }),
    } as Response);

    await expect(
      deleteProjectCategory("project-1", "category-x"),
    ).rejects.toThrow("Categoria não encontrada");
    await expect(
      deleteProjectCategory("project-1", "category-x"),
    ).rejects.toBeInstanceOf(DeleteProjectCategoryError);
  });
});
