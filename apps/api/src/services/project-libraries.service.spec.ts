import { describe, it, expect, vi } from "vitest";
import {
  associateLibraryToProject,
  removeLibraryFromProject,
  updateProjectLibrary,
  LibraryNotFoundError,
  ProjectLibraryAlreadyExistsError,
  ProjectLibraryNotFoundError,
  ProjectNotFoundError,
  CategoryNotFoundError,
  type ProjectLibrariesRepository,
} from "./project-libraries.service";

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: null,
  createdAt: new Date("2026-10-31T00:00:00Z"),
  updatedAt: new Date("2026-10-31T00:00:00Z"),
};

const library = {
  id: "library-1",
  name: "react",
  categoryId: null,
  notes: null,
  createdAt: new Date("2026-10-31T00:00:00Z"),
  updatedAt: new Date("2026-10-31T00:00:00Z"),
};

const projectLibrary = {
  id: "project-library-1",
  projectId: "project-1",
  libraryId: "library-1",
  version: "18.3.1",
  categoryId: null,
  createdAt: new Date("2026-10-31T00:00:00Z"),
};

const globalCategory = {
  id: "category-global",
  projectId: null,
  name: "Frontend",
  createdAt: new Date("2026-10-31T00:00:00Z"),
};

const ownProjectCategory = {
  id: "category-own",
  projectId: "project-1",
  name: "Infra interna",
  createdAt: new Date("2026-10-31T00:00:00Z"),
};

const otherProjectCategory = {
  id: "category-other",
  projectId: "project-9",
  name: "Infra de outro projeto",
  createdAt: new Date("2026-10-31T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<ProjectLibrariesRepository> = {},
): ProjectLibrariesRepository {
  return {
    findProjectById: vi.fn().mockResolvedValue(project),
    findLibraryById: vi.fn().mockResolvedValue(library),
    findProjectLibrary: vi.fn().mockResolvedValue(undefined),
    insertProjectLibrary: vi.fn().mockResolvedValue(projectLibrary),
    updateProjectLibrary: vi
      .fn()
      .mockResolvedValue({ ...projectLibrary, version: "19.0.0" }),
    findCategoryById: vi.fn().mockResolvedValue(undefined),
    deleteProjectLibrary: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("associateLibraryToProject", () => {
  it("associa a biblioteca ao projeto com a versão informada", async () => {
    const repository = fakeRepository();

    const result = await associateLibraryToProject(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "18.3.1",
    });

    expect(result).toEqual(projectLibrary);
    expect(repository.insertProjectLibrary).toHaveBeenCalledWith({
      projectId: "project-1",
      libraryId: "library-1",
      version: "18.3.1",
      categoryId: null,
    });
    expect(repository.findCategoryById).not.toHaveBeenCalled();
  });

  it("grava version null quando a versão não é informada", async () => {
    const repository = fakeRepository({
      insertProjectLibrary: vi
        .fn()
        .mockResolvedValue({ ...projectLibrary, version: null }),
    });

    const result = await associateLibraryToProject(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
    });

    expect(result.version).toBeNull();
    expect(repository.insertProjectLibrary).toHaveBeenCalledWith({
      projectId: "project-1",
      libraryId: "library-1",
      version: null,
      categoryId: null,
    });
  });

  it("associa com categoria global", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(globalCategory),
    });

    await associateLibraryToProject(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
      categoryId: "category-global",
    });

    expect(repository.findCategoryById).toHaveBeenCalledWith("category-global");
    expect(repository.insertProjectLibrary).toHaveBeenCalledWith({
      projectId: "project-1",
      libraryId: "library-1",
      version: null,
      categoryId: "category-global",
    });
  });

  it("associa com categoria do próprio projeto", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(ownProjectCategory),
    });

    await associateLibraryToProject(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "18.3.1",
      categoryId: "category-own",
    });

    expect(repository.insertProjectLibrary).toHaveBeenCalledWith({
      projectId: "project-1",
      libraryId: "library-1",
      version: "18.3.1",
      categoryId: "category-own",
    });
  });

  it("lança CategoryNotFoundError quando a categoria é de outro projeto, sem gravar", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(otherProjectCategory),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
        categoryId: "category-other",
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança CategoryNotFoundError quando a categoria não existe, sem gravar", async () => {
    const repository = fakeRepository();

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
        categoryId: "category-missing",
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("sem categoryId, propaga foreign key violation (23503) sem traduzir — só pode vir de library_id/project_id", async () => {
    const fkError = { cause: { code: "23503" } };
    const repository = fakeRepository({
      insertProjectLibrary: vi.fn().mockRejectedValue(fkError),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
      }),
    ).rejects.toBe(fkError);
  });

  it("traduz foreign key violation (23503) da corrida na categoria em CategoryNotFoundError", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(globalCategory),
      insertProjectLibrary: vi
        .fn()
        .mockRejectedValue({ cause: { code: "23503" } }),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
        categoryId: "category-global",
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });

  it("lança ProjectNotFoundError quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-inexistente",
        libraryId: "library-1",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança ProjectNotFoundError quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository();

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-2",
        projectId: "project-1",
        libraryId: "library-1",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança LibraryNotFoundError quando a biblioteca não existe", async () => {
    const repository = fakeRepository({
      findLibraryById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-inexistente",
      }),
    ).rejects.toBeInstanceOf(LibraryNotFoundError);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança ProjectLibraryAlreadyExistsError quando a biblioteca já está no projeto", async () => {
    const repository = fakeRepository({
      findProjectLibrary: vi.fn().mockResolvedValue(projectLibrary),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
        version: "19.0.0",
      }),
    ).rejects.toBeInstanceOf(ProjectLibraryAlreadyExistsError);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("traduz unique violation (23505) da corrida em ProjectLibraryAlreadyExistsError", async () => {
    const repository = fakeRepository({
      insertProjectLibrary: vi
        .fn()
        .mockRejectedValue({ cause: { code: "23505" } }),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
      }),
    ).rejects.toBeInstanceOf(ProjectLibraryAlreadyExistsError);
  });

  it("propaga outros erros do insert sem traduzir", async () => {
    const dbError = new Error("conexão caiu");
    const repository = fakeRepository({
      insertProjectLibrary: vi.fn().mockRejectedValue(dbError),
    });

    await expect(
      associateLibraryToProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
      }),
    ).rejects.toBe(dbError);
  });
});

describe("removeLibraryFromProject", () => {
  it("remove a associação do projeto", async () => {
    const repository = fakeRepository();

    await removeLibraryFromProject(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
    });

    expect(repository.deleteProjectLibrary).toHaveBeenCalledWith(
      "project-1",
      "library-1",
    );
  });

  it("lança ProjectNotFoundError quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository();

    await expect(
      removeLibraryFromProject(repository, {
        userId: "user-2",
        projectId: "project-1",
        libraryId: "library-1",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.deleteProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança ProjectNotFoundError quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      removeLibraryFromProject(repository, {
        userId: "user-1",
        projectId: "project-inexistente",
        libraryId: "library-1",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.deleteProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança ProjectLibraryNotFoundError quando a biblioteca não está no projeto", async () => {
    const repository = fakeRepository({
      deleteProjectLibrary: vi.fn().mockResolvedValue(false),
    });

    await expect(
      removeLibraryFromProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
      }),
    ).rejects.toBeInstanceOf(ProjectLibraryNotFoundError);
  });
});

describe("updateProjectLibrary", () => {
  it("troca a versão e retorna a associação atualizada", async () => {
    const repository = fakeRepository();

    const result = await updateProjectLibrary(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "19.0.0",
    });

    expect(result.version).toBe("19.0.0");
    expect(repository.updateProjectLibrary).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      { version: "19.0.0" },
    );
  });

  it("aceita version null (limpa a versão)", async () => {
    const repository = fakeRepository({
      updateProjectLibrary: vi
        .fn()
        .mockResolvedValue({ ...projectLibrary, version: null }),
    });

    const result = await updateProjectLibrary(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: null,
    });

    expect(result.version).toBeNull();
    expect(repository.updateProjectLibrary).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      { version: null },
    );
  });

  it("lança ProjectNotFoundError quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository();

    await expect(
      updateProjectLibrary(repository, {
        userId: "user-2",
        projectId: "project-1",
        libraryId: "library-1",
        version: "19.0.0",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.updateProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança ProjectNotFoundError quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      updateProjectLibrary(repository, {
        userId: "user-1",
        projectId: "project-inexistente",
        libraryId: "library-1",
        version: "19.0.0",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.updateProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança ProjectLibraryNotFoundError quando a biblioteca não está no projeto", async () => {
    const repository = fakeRepository({
      updateProjectLibrary: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      updateProjectLibrary(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
        version: "19.0.0",
      }),
    ).rejects.toBeInstanceOf(ProjectLibraryNotFoundError);
  });
});

describe("updateProjectLibrary — categoria da associação", () => {
  const input = {
    userId: "user-1",
    projectId: "project-1",
    libraryId: "library-1",
  };

  it("aceita categoria global e repassa só o campo informado", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(globalCategory),
    });

    await updateProjectLibrary(repository, {
      ...input,
      categoryId: "category-global",
    });

    expect(repository.updateProjectLibrary).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      { categoryId: "category-global" },
    );
  });

  it("aceita categoria do próprio projeto", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(ownProjectCategory),
    });

    await updateProjectLibrary(repository, {
      ...input,
      categoryId: "category-own",
      version: "19.0.0",
    });

    expect(repository.updateProjectLibrary).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      { categoryId: "category-own", version: "19.0.0" },
    );
  });

  it("categoryId null volta ao padrão da biblioteca sem buscar categoria", async () => {
    const repository = fakeRepository();

    await updateProjectLibrary(repository, { ...input, categoryId: null });

    expect(repository.findCategoryById).not.toHaveBeenCalled();
    expect(repository.updateProjectLibrary).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      { categoryId: null },
    );
  });

  it("lança CategoryNotFoundError quando a categoria é de outro projeto", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(otherProjectCategory),
    });

    await expect(
      updateProjectLibrary(repository, {
        ...input,
        categoryId: "category-other",
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(repository.updateProjectLibrary).not.toHaveBeenCalled();
  });

  it("lança CategoryNotFoundError quando a categoria não existe", async () => {
    const repository = fakeRepository();

    await expect(
      updateProjectLibrary(repository, { ...input, categoryId: "category-x" }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(repository.updateProjectLibrary).not.toHaveBeenCalled();
  });

  it("traduz foreign key violation (23503) da corrida em CategoryNotFoundError", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(ownProjectCategory),
      updateProjectLibrary: vi
        .fn()
        .mockRejectedValue({ cause: { code: "23503" } }),
    });

    await expect(
      updateProjectLibrary(repository, {
        ...input,
        categoryId: "category-own",
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
