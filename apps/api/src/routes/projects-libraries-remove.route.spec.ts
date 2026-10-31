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

function fakeRepository(
  overrides: Partial<ProjectLibrariesRepository> = {},
): ProjectLibrariesRepository {
  return {
    findProjectById: vi.fn().mockResolvedValue(project),
    findLibraryById: vi.fn().mockResolvedValue(undefined),
    findProjectLibrary: vi.fn().mockResolvedValue(undefined),
    insertProjectLibrary: vi.fn(),
    updateProjectLibraryVersion: vi.fn(),
    deleteProjectLibrary: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function remove(
  repository: ProjectLibrariesRepository,
  headers: Record<string, string> = { authorization: authHeader() },
) {
  const app = buildServer({
    projectLibraryAssociationsRepository: repository,
    authConfig: fakeAuthConfig,
  });

  return app.inject({
    method: "DELETE",
    url: "/projects/project-1/libraries/library-1",
    headers,
  });
}

describe("DELETE /projects/:id/libraries/:libraryId", () => {
  it("retorna 204 sem corpo quando remove a associação", async () => {
    const repository = fakeRepository();

    const response = await remove(repository);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect(repository.deleteProjectLibrary).toHaveBeenCalledWith(
      "project-1",
      "library-1",
    );
  });

  it("retorna 404 quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    const response = await remove(repository);

    expect(response.statusCode).toBe(404);
    expect(repository.deleteProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository();

    const response = await remove(repository, {
      authorization: authHeader("user-2"),
    });

    expect(response.statusCode).toBe(404);
    expect(repository.deleteProjectLibrary).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a biblioteca não está associada ao projeto", async () => {
    const repository = fakeRepository({
      deleteProjectLibrary: vi.fn().mockResolvedValue(false),
    });

    const response = await remove(repository);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const repository = fakeRepository();

    const response = await remove(repository, {});

    expect(response.statusCode).toBe(401);
    expect(repository.deleteProjectLibrary).not.toHaveBeenCalled();
  });
});
