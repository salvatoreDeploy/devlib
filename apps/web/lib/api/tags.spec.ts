import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addTagToLibrary,
  AddTagToLibraryError,
  listLibraryTags,
  ListLibraryTagsError,
} from "./tags";

describe("listLibraryTags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o Authorization header e retorna as tags da biblioteca", async () => {
    const tags = [
      { id: "tag-1", name: "react", createdAt: "2026-09-05T00:00:00.000Z" },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tags),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listLibraryTags("library-1", "access-token");

    expect(result).toEqual(tags);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/libraries/library-1/tags");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("lança ListLibraryTagsError com a mensagem da API quando a busca falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Biblioteca não encontrada" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listLibraryTags("library-x", "access-token")).rejects.toThrow(
      "Biblioteca não encontrada",
    );
    await expect(
      listLibraryTags("library-x", "access-token"),
    ).rejects.toBeInstanceOf(ListLibraryTagsError);
  });
});

describe("addTagToLibrary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia POST com o body e o Authorization header corretos e retorna a tag", async () => {
    const tag = {
      id: "tag-1",
      name: "react",
      createdAt: "2026-09-05T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tag),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await addTagToLibrary("library-1", "react", "access-token");

    expect(result).toEqual(tag);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/libraries/library-1/tags");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer access-token",
    });
    expect(JSON.parse(init.body)).toEqual({ name: "react" });
  });

  it("lança AddTagToLibraryError com a mensagem da API quando a associação falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'A tag "react" já está associada a essa biblioteca',
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      addTagToLibrary("library-1", "react", "access-token"),
    ).rejects.toThrow('A tag "react" já está associada a essa biblioteca');
    await expect(
      addTagToLibrary("library-1", "react", "access-token"),
    ).rejects.toBeInstanceOf(AddTagToLibraryError);
  });
});
