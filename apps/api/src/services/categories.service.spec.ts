import { describe, it, expect, vi } from "vitest";
import {
  listCategories,
  listCategoriesForProject,
  createCategory,
  CategoryNameAlreadyExistsError,
  type CategoriesRepository,
} from "./categories.service";

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

function fakeRepository(
  overrides: Partial<CategoriesRepository> = {},
): CategoriesRepository {
  return {
    findGlobalCategories: vi.fn().mockResolvedValue([category]),
    findCategoriesForProject: vi
      .fn()
      .mockResolvedValue([category, projectCategory]),
    findCategoryByProjectIdAndName: vi.fn().mockResolvedValue(undefined),
    insertCategory: vi.fn().mockResolvedValue(projectCategory),
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

describe("listCategoriesForProject", () => {
  it("retorna as categorias globais e as do projeto combinadas", async () => {
    const repository = fakeRepository();

    const result = await listCategoriesForProject(repository, "project-1");

    expect(result).toEqual([category, projectCategory]);
    expect(repository.findCategoriesForProject).toHaveBeenCalledWith(
      "project-1",
    );
  });

  it("retorna array vazio quando não há categorias globais nem do projeto", async () => {
    const repository = fakeRepository({
      findCategoriesForProject: vi.fn().mockResolvedValue([]),
    });

    const result = await listCategoriesForProject(repository, "project-1");

    expect(result).toEqual([]);
  });
});

describe("createCategory", () => {
  it("cria a categoria quando não há outra com o mesmo nome no projeto", async () => {
    const repository = fakeRepository();

    const result = await createCategory(repository, {
      projectId: "project-1",
      name: "Infra interna",
    });

    expect(result).toEqual(projectCategory);
    expect(repository.findCategoryByProjectIdAndName).toHaveBeenCalledWith(
      "project-1",
      "Infra interna",
    );
    expect(repository.insertCategory).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "Infra interna",
    });
  });

  it("lança CategoryNameAlreadyExistsError quando já existe categoria com esse nome no mesmo projeto", async () => {
    const repository = fakeRepository({
      findCategoryByProjectIdAndName: vi
        .fn()
        .mockResolvedValue(projectCategory),
    });

    await expect(
      createCategory(repository, {
        projectId: "project-1",
        name: "Infra interna",
      }),
    ).rejects.toThrow(CategoryNameAlreadyExistsError);
    expect(repository.insertCategory).not.toHaveBeenCalled();
  });

  it("não bloqueia quando uma categoria global tem o mesmo nome (escopos diferentes)", async () => {
    const repository = fakeRepository();

    await createCategory(repository, {
      projectId: "project-1",
      name: "Frontend",
    });

    expect(repository.insertCategory).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "Frontend",
    });
  });
});
