import { describe, it, expect, vi } from "vitest";
import {
  createLibrary,
  listLibraries,
  getLibrary,
  updateLibrary,
  deleteLibrary,
  LibraryNotFoundError,
  LibraryNameAlreadyExistsError,
  CategoryNotFoundError,
  type LibrariesRepository,
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

function fakeRepository(
  overrides: Partial<LibrariesRepository> = {},
): LibrariesRepository {
  return {
    insertLibrary: vi.fn().mockResolvedValue(library),
    findLibraries: vi.fn().mockResolvedValue([library]),
    findLibraryById: vi.fn().mockResolvedValue(library),
    findLibraryByName: vi.fn().mockResolvedValue(undefined),
    updateLibrary: vi.fn().mockResolvedValue(library),
    deleteLibrary: vi.fn().mockResolvedValue(undefined),
    findCategoryById: vi.fn().mockResolvedValue(category),
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
