import { describe, it, expect, vi } from "vitest";
import {
  createCategoriesRepository,
  type DbClient,
} from "./categories.repository";

function fakeDbForSelectWithLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from, where, limit };
}

function fakeDbForSelectWithWhere(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from, where };
}

function fakeDbForInsert(row: unknown) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  return { db: { insert } as unknown as DbClient, insert, values, returning };
}

function fakeDbForDelete() {
  const where = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where });

  return { db: { delete: del } as unknown as DbClient, delete: del, where };
}

const category = {
  id: "category-1",
  projectId: null,
  name: "Frontend",
  createdAt: new Date("2026-09-03T00:00:00Z"),
};

const projectCategory = {
  id: "category-2",
  projectId: "project-1",
  name: "Infra interna",
  createdAt: new Date("2026-09-03T00:00:00Z"),
};

describe("createCategoriesRepository", () => {
  describe("findCategoryById", () => {
    it("retorna a categoria quando o id existe", async () => {
      const { db } = fakeDbForSelectWithLimit([category]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findCategoryById("category-1");

      expect(result).toEqual(category);
    });

    it("retorna undefined quando o id não existe", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findCategoryById("category-inexistente");

      expect(result).toBeUndefined();
    });
  });

  describe("findGlobalCategories", () => {
    it("retorna as categorias globais (projectId null)", async () => {
      const { db, where } = fakeDbForSelectWithWhere([category]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findGlobalCategories();

      expect(result).toEqual([category]);
      expect(where).toHaveBeenCalledOnce();
    });

    it("retorna array vazio quando não há categorias globais", async () => {
      const { db } = fakeDbForSelectWithWhere([]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findGlobalCategories();

      expect(result).toEqual([]);
    });
  });

  describe("findCategoriesForProject", () => {
    it("retorna as categorias globais e as do projeto combinadas", async () => {
      const { db, where } = fakeDbForSelectWithWhere([
        category,
        projectCategory,
      ]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findCategoriesForProject("project-1");

      expect(result).toEqual([category, projectCategory]);
      expect(where).toHaveBeenCalledOnce();
    });

    it("retorna array vazio quando não há categorias globais nem do projeto", async () => {
      const { db } = fakeDbForSelectWithWhere([]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findCategoriesForProject("project-1");

      expect(result).toEqual([]);
    });
  });

  describe("findCategoryByProjectIdAndName", () => {
    it("retorna a categoria quando já existe uma com esse nome no projeto", async () => {
      const { db } = fakeDbForSelectWithLimit([projectCategory]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findCategoryByProjectIdAndName(
        "project-1",
        "Infra interna",
      );

      expect(result).toEqual(projectCategory);
    });

    it("retorna undefined quando não há categoria com esse nome no projeto", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createCategoriesRepository(db);
      const result = await repository.findCategoryByProjectIdAndName(
        "project-1",
        "inexistente",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("insertCategory", () => {
    it("insere e retorna a categoria criada, associada ao projeto", async () => {
      const { db, values } = fakeDbForInsert(projectCategory);

      const repository = createCategoriesRepository(db);
      const result = await repository.insertCategory({
        projectId: "project-1",
        name: "Infra interna",
      });

      expect(result).toEqual(projectCategory);
      expect(values).toHaveBeenCalledWith({
        projectId: "project-1",
        name: "Infra interna",
      });
    });
  });

  describe("deleteCategory", () => {
    it("exclui a categoria pelo id", async () => {
      const { db, delete: del, where } = fakeDbForDelete();

      const repository = createCategoriesRepository(db);
      await repository.deleteCategory("category-2");

      expect(del).toHaveBeenCalledOnce();
      expect(where).toHaveBeenCalledOnce();
    });
  });
});
