import { describe, it, expect, vi } from "vitest";
import {
  associateLibraryToProject,
  removeLibraryFromProject,
  updateProjectLibraryVersion,
  LibraryNotFoundError,
  ProjectLibraryAlreadyExistsError,
  ProjectLibraryNotFoundError,
  ProjectNotFoundError,
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
    updateProjectLibraryVersion: vi
      .fn()
      .mockResolvedValue({ ...projectLibrary, version: "19.0.0" }),
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
    });
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
    });
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

describe("updateProjectLibraryVersion", () => {
  it("troca a versão e retorna a associação atualizada", async () => {
    const repository = fakeRepository();

    const result = await updateProjectLibraryVersion(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "19.0.0",
    });

    expect(result.version).toBe("19.0.0");
    expect(repository.updateProjectLibraryVersion).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      "19.0.0",
    );
  });

  it("aceita version null (limpa a versão)", async () => {
    const repository = fakeRepository({
      updateProjectLibraryVersion: vi
        .fn()
        .mockResolvedValue({ ...projectLibrary, version: null }),
    });

    const result = await updateProjectLibraryVersion(repository, {
      userId: "user-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: null,
    });

    expect(result.version).toBeNull();
    expect(repository.updateProjectLibraryVersion).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      null,
    );
  });

  it("lança ProjectNotFoundError quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository();

    await expect(
      updateProjectLibraryVersion(repository, {
        userId: "user-2",
        projectId: "project-1",
        libraryId: "library-1",
        version: "19.0.0",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });

  it("lança ProjectNotFoundError quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      updateProjectLibraryVersion(repository, {
        userId: "user-1",
        projectId: "project-inexistente",
        libraryId: "library-1",
        version: "19.0.0",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });

  it("lança ProjectLibraryNotFoundError quando a biblioteca não está no projeto", async () => {
    const repository = fakeRepository({
      updateProjectLibraryVersion: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      updateProjectLibraryVersion(repository, {
        userId: "user-1",
        projectId: "project-1",
        libraryId: "library-1",
        version: "19.0.0",
      }),
    ).rejects.toBeInstanceOf(ProjectLibraryNotFoundError);
  });
});
