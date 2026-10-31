import { describe, it, expect, vi } from "vitest";
import {
  createProjectLibrariesRepository,
  type DbClient,
} from "./project-libraries.repository";

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

function fakeDbForDeleteReturning(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const del = vi.fn().mockReturnValue({ where });

  return {
    db: { delete: del } as unknown as DbClient,
    delete: del,
    where,
    returning,
  };
}

const projectLibrary = {
  id: "project-library-1",
  projectId: "project-1",
  libraryId: "library-1",
  version: "18.3.1",
  createdAt: new Date("2026-10-31T00:00:00Z"),
};

describe("createProjectLibrariesRepository", () => {
  describe("findProjectLibrary", () => {
    it("retorna a associação quando o par projeto+biblioteca existe", async () => {
      const { db, where } = fakeDbForSelectWithLimit([projectLibrary]);

      const repository = createProjectLibrariesRepository(db);
      const result = await repository.findProjectLibrary(
        "project-1",
        "library-1",
      );

      expect(result).toEqual(projectLibrary);
      expect(where).toHaveBeenCalledOnce();
    });

    it("retorna undefined quando a associação não existe", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createProjectLibrariesRepository(db);
      const result = await repository.findProjectLibrary(
        "project-1",
        "library-inexistente",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("insertProjectLibrary", () => {
    it("grava a associação com a versão informada e retorna o registro", async () => {
      const { db, values } = fakeDbForInsert(projectLibrary);

      const repository = createProjectLibrariesRepository(db);
      const result = await repository.insertProjectLibrary({
        projectId: "project-1",
        libraryId: "library-1",
        version: "18.3.1",
      });

      expect(result).toEqual(projectLibrary);
      expect(values).toHaveBeenCalledWith({
        projectId: "project-1",
        libraryId: "library-1",
        version: "18.3.1",
      });
    });

    it("grava version null quando não há versão", async () => {
      const { db, values } = fakeDbForInsert({
        ...projectLibrary,
        version: null,
      });

      const repository = createProjectLibrariesRepository(db);
      const result = await repository.insertProjectLibrary({
        projectId: "project-1",
        libraryId: "library-1",
        version: null,
      });

      expect(result.version).toBeNull();
      expect(values).toHaveBeenCalledWith({
        projectId: "project-1",
        libraryId: "library-1",
        version: null,
      });
    });
  });

  describe("deleteProjectLibrary", () => {
    it("retorna true quando removeu a associação", async () => {
      const { db, where } = fakeDbForDeleteReturning([
        { id: "project-library-1" },
      ]);

      const repository = createProjectLibrariesRepository(db);
      const result = await repository.deleteProjectLibrary(
        "project-1",
        "library-1",
      );

      expect(result).toBe(true);
      expect(where).toHaveBeenCalledOnce();
    });

    it("retorna false quando não havia associação pra remover", async () => {
      const { db } = fakeDbForDeleteReturning([]);

      const repository = createProjectLibrariesRepository(db);
      const result = await repository.deleteProjectLibrary(
        "project-1",
        "library-inexistente",
      );

      expect(result).toBe(false);
    });
  });
});
