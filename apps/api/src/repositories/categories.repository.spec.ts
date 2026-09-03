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

const category = {
  id: "category-1",
  projectId: null,
  name: "Frontend",
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
});
