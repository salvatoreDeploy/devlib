import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addTagToLibrary,
  AddTagToLibraryError,
  listLibraryTags,
  ListLibraryTagsError,
} from "./tags";
import { authenticatedFetch } from "./http-client";

vi.mock("./http-client", () => ({ authenticatedFetch: vi.fn() }));

describe("listLibraryTags", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna as tags da biblioteca", async () => {
    const tags = [
      { id: "tag-1", name: "react", createdAt: "2026-09-05T00:00:00.000Z" },
    ];
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tags),
    } as Response);

    const result = await listLibraryTags("library-1");

    expect(result).toEqual(tags);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/libraries/library-1/tags",
    );
  });

  it("lança ListLibraryTagsError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Biblioteca não encontrada" }),
    } as Response);

    await expect(listLibraryTags("library-x")).rejects.toThrow(
      "Biblioteca não encontrada",
    );
    await expect(listLibraryTags("library-x")).rejects.toBeInstanceOf(
      ListLibraryTagsError,
    );
  });
});

describe("addTagToLibrary", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia POST com o body correto e retorna a tag", async () => {
    const tag = {
      id: "tag-1",
      name: "react",
      createdAt: "2026-09-05T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tag),
    } as Response);

    const result = await addTagToLibrary("library-1", "react");

    expect(result).toEqual(tag);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/libraries/library-1/tags",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "react" }),
      }),
    );
  });

  it("lança AddTagToLibraryError com a mensagem da API quando a associação falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'A tag "react" já está associada a essa biblioteca',
        }),
    } as Response);

    await expect(addTagToLibrary("library-1", "react")).rejects.toThrow(
      'A tag "react" já está associada a essa biblioteca',
    );
    await expect(addTagToLibrary("library-1", "react")).rejects.toBeInstanceOf(
      AddTagToLibraryError,
    );
  });
});
