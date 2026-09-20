import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { ProjectsOverviewRepository } from "../services/projects.service";
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

function fakeProjectsOverviewRepository(
  overrides: Partial<ProjectsOverviewRepository> = {},
): ProjectsOverviewRepository {
  return {
    findProjectsOverview: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("GET /projects/overview", () => {
  it("retorna 200 com os projetos do usuário autenticado e o librariesCount", async () => {
    const overview = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
      librariesCount: 3,
    };
    const app = buildServer({
      projectsOverviewRepository: fakeProjectsOverviewRepository({
        findProjectsOverview: vi.fn().mockResolvedValue([overview]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/overview",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([
      { id: "project-1", librariesCount: 3 },
    ]);
  });

  it("retorna array vazio quando o usuário ainda não tem projetos", async () => {
    const app = buildServer({
      projectsOverviewRepository: fakeProjectsOverviewRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/overview",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsOverviewRepository: fakeProjectsOverviewRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/overview",
    });

    expect(response.statusCode).toBe(401);
  });
});
