import { describe, it, expect, vi } from "vitest";
import {
  createLibrary,
  listLibraries,
  getLibrary,
  updateLibrary,
  deleteLibrary,
  listLibraryProjects,
  listLibrariesOverview,
  LibraryNotFoundError,
  LibraryNameAlreadyExistsError,
  CategoryNotFoundError,
  type LibraryProjectsRepository,
  type LibrariesOverviewRepository,
} from "./libraries.service";

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: "ORM leve, migrations explícitas",
  createdAt: new Date("2026-09-03T00:00:00Z"),
  updatedAt: new Date("2026-09-03T00:00:00Z"),
};

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: new Date("2026-09-03T00:00:00Z"),
};

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: null,
  version: "1.2.3",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<LibraryProjectsRepository> = {},
): LibraryProjectsRepository {
  return {
    insertLibrary: vi.fn().mockResolvedValue(library),
    findLibraries: vi.fn().mockResolvedValue([library]),
    findLibraryById: vi.fn().mockResolvedValue(library),
    findLibraryByName: vi.fn().mockResolvedValue(undefined),
    updateLibrary: vi.fn().mockResolvedValue(library),
    deleteLibrary: vi.fn().mockResolvedValue(undefined),
    findCategoryById: vi.fn().mockResolvedValue(category),
    findLibrariesByProjectId: vi.fn().mockResolvedValue([]),
    findProjectsByLibraryId: vi.fn().mockResolvedValue([project]),
    ...overrides,
  };
}

describe("createLibrary", () => {
  it("cria a biblioteca quando o nome não existe e a categoria (se informada) existe", async () => {
    const repository = fakeRepository();

    const result = await createLibrary(repository, {
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve, migrations explícitas",
    });

    expect(result).toEqual(library);
    expect(repository.insertLibrary).toHaveBeenCalledWith({
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve, migrations explícitas",
    });
  });

  it("cria a biblioteca sem categoryId, sem checar categoria", async () => {
    const repository = fakeRepository();

    await createLibrary(repository, { name: "drizzle-orm" });

    expect(repository.findCategoryById).not.toHaveBeenCalled();
    expect(repository.insertLibrary).toHaveBeenCalledWith({
      name: "drizzle-orm",
    });
  });

  it("lança LibraryNameAlreadyExistsError quando já existe uma biblioteca com esse nome", async () => {
    const repository = fakeRepository({
      findLibraryByName: vi.fn().mockResolvedValue(library),
    });

    await expect(
      createLibrary(repository, { name: "drizzle-orm" }),
    ).rejects.toThrow(LibraryNameAlreadyExistsError);
    expect(repository.insertLibrary).not.toHaveBeenCalled();
  });

  it("lança CategoryNotFoundError quando categoryId não existe", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      createLibrary(repository, {
        name: "drizzle-orm",
        categoryId: "category-x",
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    expect(repository.insertLibrary).not.toHaveBeenCalled();
  });
});

describe("listLibraryProjects", () => {
  it("retorna os projetos do usuário autenticado que usam a biblioteca", async () => {
    const repository = fakeRepository();

    const result = await listLibraryProjects(repository, {
      userId: "user-1",
      libraryId: "library-1",
    });

    expect(result).toEqual([project]);
    expect(repository.findProjectsByLibraryId).toHaveBeenCalledWith(
      "library-1",
      "user-1",
    );
  });

  it("retorna array vazio quando nenhum projeto do usuário usa a biblioteca", async () => {
    const repository = fakeRepository({
      findProjectsByLibraryId: vi.fn().mockResolvedValue([]),
    });

    const result = await listLibraryProjects(repository, {
      userId: "user-1",
      libraryId: "library-1",
    });

    expect(result).toEqual([]);
  });

  it("lança LibraryNotFoundError quando a biblioteca não existe", async () => {
    const repository = fakeRepository({
      findLibraryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      listLibraryProjects(repository, {
        userId: "user-1",
        libraryId: "library-x",
      }),
    ).rejects.toThrow(LibraryNotFoundError);
    expect(repository.findProjectsByLibraryId).not.toHaveBeenCalled();
  });
});

describe("listLibraries", () => {
  it("retorna todas as bibliotecas do catálogo", async () => {
    const repository = fakeRepository();

    const result = await listLibraries(repository);

    expect(result).toEqual([library]);
    expect(repository.findLibraries).toHaveBeenCalledOnce();
  });
});

describe("getLibrary", () => {
  it("retorna a biblioteca quando existe", async () => {
    const repository = fakeRepository();

    const result = await getLibrary(repository, "library-1");

    expect(result).toEqual(library);
  });

  it("lança LibraryNotFoundError quando não existe", async () => {
    const repository = fakeRepository({
      findLibraryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(getLibrary(repository, "library-x")).rejects.toThrow(
      LibraryNotFoundError,
    );
  });
});

describe("updateLibrary", () => {
  it("atualiza a biblioteca quando existe e o nome/categoria (se informados) são válidos", async () => {
    const updated = { ...library, notes: "nota nova" };
    const repository = fakeRepository({
      updateLibrary: vi.fn().mockResolvedValue(updated),
    });

    const result = await updateLibrary(repository, "library-1", {
      notes: "nota nova",
    });

    expect(result).toEqual(updated);
    expect(repository.updateLibrary).toHaveBeenCalledWith("library-1", {
      notes: "nota nova",
    });
  });

  it("lança LibraryNotFoundError quando a biblioteca não existe", async () => {
    const repository = fakeRepository({
      findLibraryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      updateLibrary(repository, "library-x", { notes: "nota nova" }),
    ).rejects.toThrow(LibraryNotFoundError);
    expect(repository.updateLibrary).not.toHaveBeenCalled();
  });

  it("lança LibraryNameAlreadyExistsError quando o novo nome já é usado por outra biblioteca", async () => {
    const outraLib = { ...library, id: "library-2", name: "Outro" };
    const repository = fakeRepository({
      findLibraryByName: vi.fn().mockResolvedValue(outraLib),
    });

    await expect(
      updateLibrary(repository, "library-1", { name: "Outro" }),
    ).rejects.toThrow(LibraryNameAlreadyExistsError);
    expect(repository.updateLibrary).not.toHaveBeenCalled();
  });

  it("não lança LibraryNameAlreadyExistsError ao renomear pro próprio nome atual", async () => {
    const repository = fakeRepository({
      findLibraryByName: vi.fn().mockResolvedValue(library),
    });

    await updateLibrary(repository, "library-1", { name: "drizzle-orm" });

    expect(repository.updateLibrary).toHaveBeenCalledWith("library-1", {
      name: "drizzle-orm",
    });
  });

  it("lança CategoryNotFoundError quando o novo categoryId não existe", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      updateLibrary(repository, "library-1", { categoryId: "category-x" }),
    ).rejects.toThrow(CategoryNotFoundError);
    expect(repository.updateLibrary).not.toHaveBeenCalled();
  });
});

describe("listLibrariesOverview", () => {
  function fakeOverviewRepository(
    overrides: Partial<LibrariesOverviewRepository> = {},
  ): LibrariesOverviewRepository {
    return {
      findLibrariesOverview: vi
        .fn()
        .mockResolvedValue([{ ...library, projectsCount: 0 }]),
      ...overrides,
    };
  }

  it("retorna as bibliotecas do catálogo com projectsCount, pro usuário informado", async () => {
    const overview = { ...library, projectsCount: 3 };
    const repository = fakeOverviewRepository({
      findLibrariesOverview: vi.fn().mockResolvedValue([overview]),
    });

    const result = await listLibrariesOverview(repository, "user-1");

    expect(result).toEqual([overview]);
    expect(repository.findLibrariesOverview).toHaveBeenCalledWith("user-1");
  });

  it("retorna array vazio quando o catálogo está vazio", async () => {
    const repository = fakeOverviewRepository({
      findLibrariesOverview: vi.fn().mockResolvedValue([]),
    });

    const result = await listLibrariesOverview(repository, "user-1");

    expect(result).toEqual([]);
  });
});

describe("deleteLibrary", () => {
  it("exclui a biblioteca quando existe", async () => {
    const repository = fakeRepository();

    await deleteLibrary(repository, "library-1");

    expect(repository.deleteLibrary).toHaveBeenCalledWith("library-1");
  });

  it("lança LibraryNotFoundError quando não existe, sem excluir", async () => {
    const repository = fakeRepository({
      findLibraryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(deleteLibrary(repository, "library-x")).rejects.toThrow(
      LibraryNotFoundError,
    );
    expect(repository.deleteLibrary).not.toHaveBeenCalled();
  });
});
