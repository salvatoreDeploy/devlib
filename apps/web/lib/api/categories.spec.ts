import { afterEach, describe, expect, it, vi } from "vitest";
import { getCategories, GetCategoriesError } from "./categories";
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
