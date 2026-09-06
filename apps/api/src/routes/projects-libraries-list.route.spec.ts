import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { ProjectLibrariesRepository } from "../services/projects.service";
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
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

const libraryAssociation = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: null,
  version: "1.2.3",
  createdAt: new Date("2026-09-03T00:00:00Z"),
  updatedAt: new Date("2026-09-03T00:00:00Z"),
};

function fakeProjectsLibrariesRepository(
  overrides: Partial<ProjectLibrariesRepository> = {},
): ProjectLibrariesRepository {
  return {
    insertProject: vi.fn().mockResolvedValue(undefined),
    findProjectsByUserId: vi.fn().mockResolvedValue([]),
    findProjectById: vi.fn().mockResolvedValue(project),
    findProjectByUserIdAndName: vi.fn().mockResolvedValue(undefined),
    updateProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    findLibrariesByProjectId: vi.fn().mockResolvedValue([libraryAssociation]),
    ...overrides,
  };
}

describe("GET /projects/:id/libraries", () => {
  it("retorna 200 com as bibliotecas do projeto", async () => {
    const app = buildServer({
      projectsLibrariesRepository: fakeProjectsLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/libraries",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([
      { id: "library-1", name: "drizzle-orm", version: "1.2.3" },
    ]);
  });

  it("retorna 200 com array vazio quando o projeto não tem bibliotecas associadas", async () => {
    const app = buildServer({
      projectsLibrariesRepository: fakeProjectsLibrariesRepository({
        findLibrariesByProjectId: vi.fn().mockResolvedValue([]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/libraries",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("retorna 404 quando o projeto não existe", async () => {
    const app = buildServer({
      projectsLibrariesRepository: fakeProjectsLibrariesRepository({
        findProjectById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-x/libraries",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 404 quando o projeto é de outro usuário", async () => {
    const app = buildServer({
      projectsLibrariesRepository: fakeProjectsLibrariesRepository({
        findProjectById: vi
          .fn()
          .mockResolvedValue({ ...project, userId: "outro-usuario" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/libraries",
      headers: { authorization: authHeader("user-1") },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsLibrariesRepository: fakeProjectsLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/libraries",
    });

    expect(response.statusCode).toBe(401);
  });
});
