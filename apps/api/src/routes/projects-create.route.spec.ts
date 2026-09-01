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
    insertProject: vi.fn().mockResolvedValue({
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: null,
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    }),
    findProjectsByUserId: vi.fn().mockResolvedValue([]),
    findProjectById: vi.fn().mockResolvedValue(undefined),
    findProjectByUserIdAndName: vi.fn().mockResolvedValue(undefined),
    updateProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("POST /projects", () => {
  it("retorna 201 com o projeto criado", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: authHeader() },
      payload: { name: "DevLib", description: "Catálogo pessoal" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: "project-1", name: "DevLib" });
  });

  it("retorna 409 quando o usuário já tem um projeto com esse nome", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository({
        findProjectByUserIdAndName: vi.fn().mockResolvedValue({
          id: "project-1",
          userId: "user-1",
          name: "DevLib",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: authHeader() },
      payload: { name: "DevLib" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando o nome está vazio", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: authHeader() },
      payload: { name: "" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "DevLib" },
    });

    expect(response.statusCode).toBe(401);
  });
});
