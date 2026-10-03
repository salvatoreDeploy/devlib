import { describe, it, expect, vi } from "vitest";
import {
  listCategories,
  listCategoriesForProject,
  createCategory,
  deleteCategory,
  CategoryNameAlreadyExistsError,
  CategoryNotFoundError,
  ProjectNotFoundError,
  type CategoriesRepository,
  type ProjectCategoriesRepository,
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

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: null,
  createdAt: new Date("2026-09-03T00:00:00Z"),
  updatedAt: new Date("2026-09-03T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<CategoriesRepository & ProjectCategoriesRepository> = {},
): CategoriesRepository & ProjectCategoriesRepository {
  return {
    findProjectById: vi.fn().mockResolvedValue(project),
    findGlobalCategories: vi.fn().mockResolvedValue([category]),
    findCategoriesForProject: vi
      .fn()
      .mockResolvedValue([category, projectCategory]),
    findCategoryByProjectIdAndName: vi.fn().mockResolvedValue(undefined),
    insertCategory: vi.fn().mockResolvedValue(projectCategory),
    findCategoryById: vi.fn().mockResolvedValue(projectCategory),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
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

    const result = await listCategoriesForProject(repository, {
      userId: "user-1",
      projectId: "project-1",
    });

    expect(result).toEqual([category, projectCategory]);
    expect(repository.findCategoriesForProject).toHaveBeenCalledWith(
      "project-1",
    );
  });

  it("retorna array vazio quando não há categorias globais nem do projeto", async () => {
    const repository = fakeRepository({
      findCategoriesForProject: vi.fn().mockResolvedValue([]),
    });

    const result = await listCategoriesForProject(repository, {
      userId: "user-1",
      projectId: "project-1",
    });

    expect(result).toEqual([]);
  });

  it("lança ProjectNotFoundError quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      listCategoriesForProject(repository, {
        userId: "user-1",
        projectId: "project-inexistente",
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it("lança ProjectNotFoundError quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository({
      findProjectById: vi
        .fn()
        .mockResolvedValue({ ...project, userId: "outro-user" }),
    });

    await expect(
      listCategoriesForProject(repository, {
        userId: "user-1",
        projectId: "project-1",
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});

describe("createCategory", () => {
  it("cria a categoria quando não há outra com o mesmo nome no projeto", async () => {
    const repository = fakeRepository();

    const result = await createCategory(repository, {
      userId: "user-1",
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

  it("lança ProjectNotFoundError quando o projeto não existe ou não pertence ao usuário", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      createCategory(repository, {
        userId: "user-1",
        projectId: "project-inexistente",
        name: "Infra interna",
      }),
    ).rejects.toThrow(ProjectNotFoundError);
    expect(repository.insertCategory).not.toHaveBeenCalled();
  });

  it("lança CategoryNameAlreadyExistsError quando já existe categoria com esse nome no mesmo projeto", async () => {
    const repository = fakeRepository({
      findCategoryByProjectIdAndName: vi
        .fn()
        .mockResolvedValue(projectCategory),
    });

    await expect(
      createCategory(repository, {
        userId: "user-1",
        projectId: "project-1",
        name: "Infra interna",
      }),
    ).rejects.toThrow(CategoryNameAlreadyExistsError);
    expect(repository.insertCategory).not.toHaveBeenCalled();
  });

  it("não bloqueia quando uma categoria global tem o mesmo nome (escopos diferentes)", async () => {
    const repository = fakeRepository();

    await createCategory(repository, {
      userId: "user-1",
      projectId: "project-1",
      name: "Frontend",
    });

    expect(repository.insertCategory).toHaveBeenCalledWith({
      projectId: "project-1",
      name: "Frontend",
    });
  });
});

describe("deleteCategory", () => {
  it("exclui a categoria quando ela pertence ao projeto informado", async () => {
    const repository = fakeRepository();

    await deleteCategory(repository, {
      userId: "user-1",
      projectId: "project-1",
      categoryId: "category-2",
    });

    expect(repository.deleteCategory).toHaveBeenCalledWith("category-2");
  });

  it("lança ProjectNotFoundError quando o projeto não existe ou não pertence ao usuário", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      deleteCategory(repository, {
        userId: "user-1",
        projectId: "project-inexistente",
        categoryId: "category-2",
      }),
    ).rejects.toThrow(ProjectNotFoundError);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("lança CategoryNotFoundError quando a categoria não existe", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      deleteCategory(repository, {
        userId: "user-1",
        projectId: "project-1",
        categoryId: "category-inexistente",
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("lança CategoryNotFoundError quando a categoria é global (não pertence a nenhum projeto)", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(category),
    });

    await expect(
      deleteCategory(repository, {
        userId: "user-1",
        projectId: "project-1",
        categoryId: "category-1",
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("lança CategoryNotFoundError quando a categoria pertence a outro projeto", async () => {
    const repository = fakeRepository({
      findCategoryById: vi
        .fn()
        .mockResolvedValue({ ...projectCategory, projectId: "project-2" }),
    });

    await expect(
      deleteCategory(repository, {
        userId: "user-1",
        projectId: "project-1",
        categoryId: "category-2",
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });
});
