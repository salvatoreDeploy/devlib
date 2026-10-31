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

const projectLibrary = {
  id: "project-library-1",
  projectId: "project-1",
  libraryId: "library-1",
  version: "19.0.0",
  createdAt: new Date("2026-10-31T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<ProjectLibrariesRepository> = {},
): ProjectLibrariesRepository {
  return {
    findProjectById: vi.fn().mockResolvedValue(project),
    findLibraryById: vi.fn().mockResolvedValue(undefined),
    findProjectLibrary: vi.fn().mockResolvedValue(undefined),
    insertProjectLibrary: vi.fn(),
    updateProjectLibraryVersion: vi.fn().mockResolvedValue(projectLibrary),
    deleteProjectLibrary: vi.fn(),
    ...overrides,
  };
}

function update(
  repository: ProjectLibrariesRepository,
  payload: unknown,
  headers: Record<string, string> = { authorization: authHeader() },
) {
  const app = buildServer({
    projectLibraryAssociationsRepository: repository,
    authConfig: fakeAuthConfig,
  });

  return app.inject({
    method: "PATCH",
    url: "/projects/project-1/libraries/library-1",
    headers,
    payload: payload as Record<string, unknown>,
  });
}

describe("PATCH /projects/:id/libraries/:libraryId", () => {
  it("retorna 200 com a associação atualizada", async () => {
    const repository = fakeRepository();

    const response = await update(repository, { version: "19.0.0" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: "project-library-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "19.0.0",
    });
    expect(repository.updateProjectLibraryVersion).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      "19.0.0",
    );
  });

  it("remove espaços nas pontas da version", async () => {
    const repository = fakeRepository();

    await update(repository, { version: "  19.0.0  " });

    expect(repository.updateProjectLibraryVersion).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      "19.0.0",
    );
  });

  it("aceita version null pra limpar a versão", async () => {
    const repository = fakeRepository({
      updateProjectLibraryVersion: vi
        .fn()
        .mockResolvedValue({ ...projectLibrary, version: null }),
    });

    const response = await update(repository, { version: null });

    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBeNull();
    expect(repository.updateProjectLibraryVersion).toHaveBeenCalledWith(
      "project-1",
      "library-1",
      null,
    );
  });

  it("retorna 404 quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    const response = await update(repository, { version: "19.0.0" });

    expect(response.statusCode).toBe(404);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository();

    const response = await update(
      repository,
      { version: "19.0.0" },
      { authorization: authHeader("user-2") },
    );

    expect(response.statusCode).toBe(404);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a biblioteca não está associada ao projeto", async () => {
    const repository = fakeRepository({
      updateProjectLibraryVersion: vi.fn().mockResolvedValue(undefined),
    });

    const response = await update(repository, { version: "19.0.0" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando o corpo não tem version", async () => {
    const repository = fakeRepository();

    const response = await update(repository, {});

    expect(response.statusCode).toBe(400);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });

  it("retorna 400 quando version é vazia ou só espaços", async () => {
    const repository = fakeRepository();

    const empty = await update(repository, { version: "" });
    const blank = await update(repository, { version: "   " });

    expect(empty.statusCode).toBe(400);
    expect(blank.statusCode).toBe(400);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });

  it("retorna 400 quando version passa de 100 caracteres", async () => {
    const repository = fakeRepository();

    const response = await update(repository, { version: "1".repeat(101) });

    expect(response.statusCode).toBe(400);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const repository = fakeRepository();

    const response = await update(repository, { version: "19.0.0" }, {});

    expect(response.statusCode).toBe(401);
    expect(repository.updateProjectLibraryVersion).not.toHaveBeenCalled();
  });
});
