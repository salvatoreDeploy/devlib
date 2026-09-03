import { afterEach, describe, expect, it, vi } from "vitest";
import { createLibrary, CreateLibraryError } from "./libraries";

describe("createLibrary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o body e o Authorization header corretos e retorna a biblioteca criada", async () => {
    const library = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(library),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLibrary(
      { name: "drizzle-orm", categoryId: "category-1", notes: "ORM leve" },
      "access-token",
    );

    expect(result).toEqual(library);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/libraries");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer access-token",
    });
    expect(JSON.parse(init.body)).toEqual({
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
    });
  });

  it("lança CreateLibraryError com a mensagem da API quando a criação falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'Já existe uma biblioteca com o nome "drizzle-orm"',
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createLibrary({ name: "drizzle-orm" }, "access-token"),
    ).rejects.toThrow('Já existe uma biblioteca com o nome "drizzle-orm"');
    await expect(
      createLibrary({ name: "drizzle-orm" }, "access-token"),
    ).rejects.toBeInstanceOf(CreateLibraryError);
  });
});
