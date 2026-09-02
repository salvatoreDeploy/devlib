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
    updateProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DELETE /projects/:id", () => {
  it("retorna 204 quando exclui com sucesso", async () => {
    const repository = fakeProjectsRepository();
    const app = buildServer({
      projectsRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(204);
    expect(repository.deleteProject).toHaveBeenCalledWith("project-1");
  });

  it("retorna 404 quando o projeto não é do usuário, sem excluir", async () => {
    const repository = fakeProjectsRepository({
      findProjectById: vi
        .fn()
        .mockResolvedValue({ ...project, userId: "outro-usuario" }),
    });
    const app = buildServer({
      projectsRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(repository.deleteProject).not.toHaveBeenCalled();
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsRepository: fakeProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1",
    });

    expect(response.statusCode).toBe(401);
  });
});
