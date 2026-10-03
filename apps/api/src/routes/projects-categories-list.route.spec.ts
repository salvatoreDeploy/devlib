import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { ProjectCategoriesRepository } from "../services/categories.service";
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

const globalCategory = {
  id: "category-1",
  projectId: null,
  name: "Frontend",
  createdAt: new Date("2026-09-03T00:00:00Z"),
};

const projectCategory = {
  id: "category-2",
  projectId: "project-1",
  name: "Infra interna",
  createdAt: new Date("2026-09-03T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<ProjectCategoriesRepository> = {},
): ProjectCategoriesRepository {
  return {
    findProjectById: vi.fn().mockResolvedValue(project),
    findCategoriesForProject: vi
      .fn()
      .mockResolvedValue([globalCategory, projectCategory]),
    findCategoryByProjectIdAndName: vi.fn().mockResolvedValue(undefined),
    insertCategory: vi.fn().mockResolvedValue(projectCategory),
    findCategoryById: vi.fn().mockResolvedValue(undefined),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("GET /projects/:id/categories", () => {
  it("retorna 200 com as categorias globais e as do projeto combinadas", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/categories",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([
      { id: "category-1", projectId: null, name: "Frontend" },
      { id: "category-2", projectId: "project-1", name: "Infra interna" },
    ]);
  });

  it("retorna 200 com array vazio quando o projeto não tem categorias próprias nem globais", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository({
        findCategoriesForProject: vi.fn().mockResolvedValue([]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/categories",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("retorna 404 quando o projeto não existe", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository({
        findProjectById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-x/categories",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 404 quando o projeto é de outro usuário", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository({
        findProjectById: vi
          .fn()
          .mockResolvedValue({ ...project, userId: "outro-usuario" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/categories",
      headers: { authorization: authHeader("user-1") },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/projects/project-1/categories",
    });

    expect(response.statusCode).toBe(401);
  });
});
