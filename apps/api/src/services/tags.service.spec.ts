import { describe, it, expect, vi } from "vitest";
import { LibraryNotFoundError } from "./libraries.service";
import {
  addTagToLibrary,
  TagAlreadyAssociatedError,
  type TagsRepository,
} from "./tags.service";

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: null,
  createdAt: new Date("2026-09-03T00:00:00Z"),
  updatedAt: new Date("2026-09-03T00:00:00Z"),
};

const tag = {
  id: "tag-1",
  name: "react",
  createdAt: new Date("2026-09-05T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<TagsRepository> = {},
): TagsRepository {
  return {
    findLibraryById: vi.fn().mockResolvedValue(library),
    findTagByName: vi.fn().mockResolvedValue(undefined),
    insertTag: vi.fn().mockResolvedValue(tag),
    findLibraryTag: vi.fn().mockResolvedValue(undefined),
    insertLibraryTag: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("addTagToLibrary", () => {
  it("cria a tag e associa quando a tag ainda não existe no catálogo", async () => {
    const repository = fakeRepository();

    const result = await addTagToLibrary(repository, "library-1", "react");

    expect(result).toEqual(tag);
    expect(repository.insertTag).toHaveBeenCalledWith("react");
    expect(repository.insertLibraryTag).toHaveBeenCalledWith(
      "library-1",
      "tag-1",
    );
  });

  it("reaproveita a tag existente e apenas associa, sem criar de novo", async () => {
    const repository = fakeRepository({
      findTagByName: vi.fn().mockResolvedValue(tag),
    });

    const result = await addTagToLibrary(repository, "library-1", "react");

    expect(result).toEqual(tag);
    expect(repository.insertTag).not.toHaveBeenCalled();
    expect(repository.insertLibraryTag).toHaveBeenCalledWith(
      "library-1",
      "tag-1",
    );
  });

  it("lança LibraryNotFoundError quando a biblioteca não existe, sem tocar em tags", async () => {
    const repository = fakeRepository({
      findLibraryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      addTagToLibrary(repository, "library-x", "react"),
    ).rejects.toThrow(LibraryNotFoundError);
    expect(repository.findTagByName).not.toHaveBeenCalled();
    expect(repository.insertLibraryTag).not.toHaveBeenCalled();
  });

  it("lança TagAlreadyAssociatedError quando a tag já está associada a essa biblioteca", async () => {
    const repository = fakeRepository({
      findTagByName: vi.fn().mockResolvedValue(tag),
      findLibraryTag: vi
        .fn()
        .mockResolvedValue({ libraryId: "library-1", tagId: "tag-1" }),
    });

    await expect(
      addTagToLibrary(repository, "library-1", "react"),
    ).rejects.toThrow(TagAlreadyAssociatedError);
    expect(repository.insertLibraryTag).not.toHaveBeenCalled();
  });
});
