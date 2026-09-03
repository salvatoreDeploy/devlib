import { describe, it, expect, vi } from "vitest";
import {
  listCategories,
  type CategoriesRepository,
} from "./categories.service";

const category = {
  id: "category-1",
  projectId: null,
  name: "Frontend",
  createdAt: new Date("2026-09-03T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<CategoriesRepository> = {},
): CategoriesRepository {
  return {
    findGlobalCategories: vi.fn().mockResolvedValue([category]),
    ...overrides,
  };
}

describe("listCategories", () => {
  it("retorna as categorias globais", async () => {
    const repository = fakeRepository();

    const result = await listCategories(repository);

    expect(result).toEqual([category]);
    expect(repository.findGlobalCategories).toHaveBeenCalledOnce();
  });

  it("retorna array vazio quando não há categorias globais", async () => {
    const repository = fakeRepository({
      findGlobalCategories: vi.fn().mockResolvedValue([]),
    });

    const result = await listCategories(repository);

    expect(result).toEqual([]);
  });
});
