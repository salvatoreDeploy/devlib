import { describe, it, expect, vi } from "vitest";
import { createTagsRepository, type DbClient } from "./tags.repository";

function fakeDbForSelectWithLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from, where, limit };
}

function fakeDbForInsert(row: unknown) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  return { db: { insert } as unknown as DbClient, insert, values, returning };
}

function fakeDbForInsertWithoutReturning() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });

  return { db: { insert } as unknown as DbClient, insert, values };
}

const tag = {
  id: "tag-1",
  name: "react",
  createdAt: new Date("2026-09-05T00:00:00Z"),
};

describe("createTagsRepository", () => {
  describe("findTagByName", () => {
    it("retorna a tag quando já existe uma com esse nome", async () => {
      const { db } = fakeDbForSelectWithLimit([tag]);

      const repository = createTagsRepository(db);
      const result = await repository.findTagByName("react");

      expect(result).toEqual(tag);
    });

    it("retorna undefined quando não há tag com esse nome", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createTagsRepository(db);
      const result = await repository.findTagByName("inexistente");

      expect(result).toBeUndefined();
    });
  });

  describe("insertTag", () => {
    it("insere e retorna a tag criada", async () => {
      const { db, values } = fakeDbForInsert(tag);

      const repository = createTagsRepository(db);
      const result = await repository.insertTag("react");

      expect(result).toEqual(tag);
      expect(values).toHaveBeenCalledWith({ name: "react" });
    });
  });

  describe("findLibraryTag", () => {
    it("retorna a associação quando ela existe", async () => {
      const association = { libraryId: "library-1", tagId: "tag-1" };
      const { db } = fakeDbForSelectWithLimit([association]);

      const repository = createTagsRepository(db);
      const result = await repository.findLibraryTag("library-1", "tag-1");

      expect(result).toEqual(association);
    });

    it("retorna undefined quando a tag não está associada a essa biblioteca", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createTagsRepository(db);
      const result = await repository.findLibraryTag("library-1", "tag-1");

      expect(result).toBeUndefined();
    });
  });

  describe("insertLibraryTag", () => {
    it("insere a associação entre biblioteca e tag", async () => {
      const { db, values } = fakeDbForInsertWithoutReturning();

      const repository = createTagsRepository(db);
      await repository.insertLibraryTag("library-1", "tag-1");

      expect(values).toHaveBeenCalledWith({
        libraryId: "library-1",
        tagId: "tag-1",
      });
    });
  });
});
