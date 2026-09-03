import { describe, it, expect, vi } from "vitest";
import {
  createLibrariesRepository,
  type DbClient,
} from "./libraries.repository";

function fakeDbForSelectAll(rows: unknown[]) {
  const from = vi.fn().mockResolvedValue(rows);
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from };
}

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

function fakeDbForUpdate(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  return {
    db: { update } as unknown as DbClient,
    update,
    set,
    where,
    returning,
  };
}

function fakeDbForDelete() {
  const where = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where });

  return { db: { delete: del } as unknown as DbClient, delete: del, where };
}

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: "ORM leve, migrations explícitas",
  createdAt: new Date("2026-09-03T00:00:00Z"),
  updatedAt: new Date("2026-09-03T00:00:00Z"),
};

describe("createLibrariesRepository", () => {
  describe("insertLibrary", () => {
    it("insere e retorna a biblioteca criada, com categoryId/notes nulos quando omitidos", async () => {
      const { db, values } = fakeDbForInsert(library);

      const repository = createLibrariesRepository(db);
      const result = await repository.insertLibrary({ name: "drizzle-orm" });

      expect(result).toEqual(library);
      expect(values).toHaveBeenCalledWith({
        name: "drizzle-orm",
        categoryId: null,
        notes: null,
      });
    });

    it("insere com categoryId e notes informados", async () => {
      const { db, values } = fakeDbForInsert(library);

      const repository = createLibrariesRepository(db);
      await repository.insertLibrary({
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: "ORM leve, migrations explícitas",
      });

      expect(values).toHaveBeenCalledWith({
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: "ORM leve, migrations explícitas",
      });
    });
  });

  describe("findLibraries", () => {
    it("retorna todas as bibliotecas do catálogo", async () => {
      const { db, select } = fakeDbForSelectAll([library]);

      const repository = createLibrariesRepository(db);
      const result = await repository.findLibraries();

      expect(result).toEqual([library]);
      expect(select).toHaveBeenCalledOnce();
    });

    it("retorna array vazio quando não há bibliotecas", async () => {
      const { db } = fakeDbForSelectAll([]);

      const repository = createLibrariesRepository(db);
      const result = await repository.findLibraries();

      expect(result).toEqual([]);
    });
  });

  describe("findLibraryById", () => {
    it("retorna a biblioteca quando o id existe", async () => {
      const { db } = fakeDbForSelectWithLimit([library]);

      const repository = createLibrariesRepository(db);
      const result = await repository.findLibraryById("library-1");

      expect(result).toEqual(library);
    });

    it("retorna undefined quando o id não existe", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createLibrariesRepository(db);
      const result = await repository.findLibraryById("library-inexistente");

      expect(result).toBeUndefined();
    });
  });

  describe("findLibraryByName", () => {
    it("retorna a biblioteca quando já existe uma com esse nome", async () => {
      const { db } = fakeDbForSelectWithLimit([library]);

      const repository = createLibrariesRepository(db);
      const result = await repository.findLibraryByName("drizzle-orm");

      expect(result).toEqual(library);
    });

    it("retorna undefined quando não há biblioteca com esse nome", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createLibrariesRepository(db);
      const result = await repository.findLibraryByName("inexistente");

      expect(result).toBeUndefined();
    });
  });

  describe("updateLibrary", () => {
    it("atualiza os campos informados e retorna a biblioteca atualizada", async () => {
      const updated = { ...library, notes: "nota atualizada" };
      const { db, set, where } = fakeDbForUpdate([updated]);

      const repository = createLibrariesRepository(db);
      const result = await repository.updateLibrary("library-1", {
        notes: "nota atualizada",
      });

      expect(result).toEqual(updated);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: "nota atualizada",
          updatedAt: expect.any(Date),
        }),
      );
      expect(where).toHaveBeenCalledOnce();
    });

    it("retorna undefined quando o id não existe", async () => {
      const { db } = fakeDbForUpdate([]);

      const repository = createLibrariesRepository(db);
      const result = await repository.updateLibrary("library-inexistente", {
        notes: "nota atualizada",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("deleteLibrary", () => {
    it("exclui a biblioteca pelo id", async () => {
      const { db, delete: del, where } = fakeDbForDelete();

      const repository = createLibrariesRepository(db);
      await repository.deleteLibrary("library-1");

      expect(del).toHaveBeenCalledOnce();
      expect(where).toHaveBeenCalledOnce();
    });
  });
});
