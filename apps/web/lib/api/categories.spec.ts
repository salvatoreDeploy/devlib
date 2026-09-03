import { afterEach, describe, expect, it, vi } from "vitest";
import { getCategories, GetCategoriesError } from "./categories";

describe("getCategories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o Authorization header e retorna as categorias", async () => {
    const categories = [
      {
        id: "category-1",
        projectId: null,
        name: "Frontend",
        createdAt: "2026-09-03T00:00:00.000Z",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(categories),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCategories("access-token");

    expect(result).toEqual(categories);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/categories");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("lança GetCategoriesError com a mensagem da API quando a busca falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Não autorizado" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCategories("access-token")).rejects.toThrow(
      "Não autorizado",
    );
    await expect(getCategories("access-token")).rejects.toBeInstanceOf(
      GetCategoriesError,
    );
  });
});
