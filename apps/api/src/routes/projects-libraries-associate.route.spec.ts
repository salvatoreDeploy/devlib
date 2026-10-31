import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { ProjectLibrariesRepository } from "../services/project-libraries.service";
import type { AuthConfig } from "../config/env";

const fakeAuthConfig: AuthConfig = {
  jwtSecret: "access-secret",
  jwtRefreshSecret: "refresh-secret",
  accessExpiresIn: "15m",
  refreshExpiresIn: "7d",
};

function authHeader(userId = "user-1") {
  const token = signAccessToken(
    { sub: userId, email: "ana@example.com" },
    fakeAuthConfig.jwtSecret,
    fakeAuthConfig.accessExpiresIn,
  );
  return `Bearer ${token}`;
}

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
    deleteProjectLibrary: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function associate(
  repository: ProjectLibrariesRepository,
  payload: unknown,
  headers: Record<string, string> = { authorization: authHeader() },
) {
  const app = buildServer({
    projectLibraryAssociationsRepository: repository,
    authConfig: fakeAuthConfig,
  });

  return app.inject({
    method: "POST",
    url: "/projects/project-1/libraries",
    headers,
    payload: payload as Record<string, unknown>,
  });
}

describe("POST /projects/:id/libraries", () => {
  it("retorna 201 com a associação criada", async () => {
    const repository = fakeRepository();

    const response = await associate(repository, {
      libraryId: "library-1",
      version: "18.3.1",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: "project-library-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "18.3.1",
    });
    expect(repository.insertProjectLibrary).toHaveBeenCalledWith({
      projectId: "project-1",
      libraryId: "library-1",
      version: "18.3.1",
    });
  });

  it("aceita associar sem version (grava null)", async () => {
    const repository = fakeRepository({
      insertProjectLibrary: vi
        .fn()
        .mockResolvedValue({ ...projectLibrary, version: null }),
    });

    const response = await associate(repository, { libraryId: "library-1" });

    expect(response.statusCode).toBe(201);
    expect(response.json().version).toBeNull();
    expect(repository.insertProjectLibrary).toHaveBeenCalledWith({
      projectId: "project-1",
      libraryId: "library-1",
      version: null,
    });
  });

  it("remove espaços nas pontas da version", async () => {
    const repository = fakeRepository();

    await associate(repository, {
      libraryId: "library-1",
      version: "  18.3.1  ",
    });

    expect(repository.insertProjectLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ version: "18.3.1" }),
    );
  });

  it("retorna 404 quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    const response = await associate(repository, { libraryId: "library-1" });

    expect(response.statusCode).toBe(404);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository();

    const response = await associate(
      repository,
      { libraryId: "library-1" },
      { authorization: authHeader("user-2") },
    );

    expect(response.statusCode).toBe(404);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a biblioteca não existe", async () => {
    const repository = fakeRepository({
      findLibraryById: vi.fn().mockResolvedValue(undefined),
    });

    const response = await associate(repository, {
      libraryId: "library-inexistente",
    });

    expect(response.statusCode).toBe(404);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 409 quando a biblioteca já está associada ao projeto", async () => {
    const repository = fakeRepository({
      findProjectLibrary: vi.fn().mockResolvedValue(projectLibrary),
    });

    const response = await associate(repository, { libraryId: "library-1" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando libraryId não é enviado", async () => {
    const repository = fakeRepository();

    const response = await associate(repository, { version: "18.3.1" });

    expect(response.statusCode).toBe(400);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 400 quando version é vazia ou só espaços", async () => {
    const repository = fakeRepository();

    const empty = await associate(repository, {
      libraryId: "library-1",
      version: "",
    });
    const blank = await associate(repository, {
      libraryId: "library-1",
      version: "   ",
    });

    expect(empty.statusCode).toBe(400);
    expect(blank.statusCode).toBe(400);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 400 quando version passa de 100 caracteres", async () => {
    const repository = fakeRepository();

    const response = await associate(repository, {
      libraryId: "library-1",
      version: "1".repeat(101),
    });

    expect(response.statusCode).toBe(400);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const repository = fakeRepository();

    const response = await associate(
      repository,
      { libraryId: "library-1" },
      {},
    );

    expect(response.statusCode).toBe(401);
    expect(repository.insertProjectLibrary).not.toHaveBeenCalled();
  });
});
