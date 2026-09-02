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

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function fakeProjectsRepository(
  overrides: Partial<ProjectsRepository> = {},
): ProjectsRepository {
  return {
    insertProject: vi.fn().mockResolvedValue(undefined),
    findProjectsByUserId: vi.fn().mockResolvedValue([]),
    findProjectById: vi.fn().mockResolvedValue(project),
    findProjectByUserIdAndName: vi.fn().mockResolvedValue(undefined),
    updateProject: vi.fn().mockResolvedValue({ ...project, name: "DevLib v2" }),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("PATCH /projects/:id", () => {
  it("retorna 200 com o projeto atualizado", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/projects/project-1",
      headers: { authorization: authHeader() },
      payload: { name: "DevLib v2" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: "DevLib v2" });
  });

  it("retorna 404 quando o projeto não é do usuário", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository({
        findProjectById: vi
          .fn()
          .mockResolvedValue({ ...project, userId: "outro-usuario" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/projects/project-1",
      headers: { authorization: authHeader() },
      payload: { name: "DevLib v2" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 409 quando o novo nome já é usado por outro projeto do usuário", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository({
        findProjectByUserIdAndName: vi
          .fn()
          .mockResolvedValue({ ...project, id: "project-2", name: "Outro" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/projects/project-1",
      headers: { authorization: authHeader() },
      payload: { name: "Outro" },
    });

    expect(response.statusCode).toBe(409);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/projects/project-1",
      payload: { name: "DevLib v2" },
    });

    expect(response.statusCode).toBe(401);
  });
});
