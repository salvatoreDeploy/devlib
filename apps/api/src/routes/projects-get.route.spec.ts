import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { ProjectsRepository } from "../services/projects.service";
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

function fakeProjectsRepository(
  overrides: Partial<ProjectsRepository> = {},
): ProjectsRepository {
  return {
    insertProject: vi.fn().mockResolvedValue(undefined),
    findProjectsByUserId: vi.fn().mockResolvedValue([]),
    findProjectById: vi.fn().mockResolvedValue(undefined),
    findProjectByUserIdAndName: vi.fn().mockResolvedValue(undefined),
    updateProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("GET /projects/:id", () => {
  it("retorna 200 com o projeto quando pertence ao usuário", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: null,
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    };
    const app = buildServer({
      projectsRepository: fakeProjectsRepository({
        findProjectById: vi.fn().mockResolvedValue(project),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: "project-1" });
  });

  it("retorna 404 quando o projeto não existe", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/00000000-0000-0000-0000-000000000000",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 404 quando o projeto é de outro usuário", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository({
        findProjectById: vi.fn().mockResolvedValue({
          id: "project-1",
          userId: "outro-usuario",
          name: "DevLib",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1",
      headers: { authorization: authHeader("user-1") },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1",
    });

    expect(response.statusCode).toBe(401);
  });
});
