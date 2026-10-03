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
    findCategoriesForProject: vi.fn().mockResolvedValue([]),
    findCategoryByProjectIdAndName: vi.fn().mockResolvedValue(undefined),
    insertCategory: vi.fn().mockResolvedValue(projectCategory),
    findCategoryById: vi.fn().mockResolvedValue(undefined),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("POST /projects/:id/categories", () => {
  it("retorna 201 com a categoria criada", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects/project-1/categories",
      headers: { authorization: authHeader() },
      payload: { name: "Infra interna" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: "category-2",
      projectId: "project-1",
      name: "Infra interna",
    });
  });

  it("retorna 404 quando o projeto não existe", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository({
        findProjectById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects/project-x/categories",
      headers: { authorization: authHeader() },
      payload: { name: "Infra interna" },
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
      method: "POST",
      url: "/projects/project-1/categories",
      headers: { authorization: authHeader("user-1") },
      payload: { name: "Infra interna" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 409 quando já existe uma categoria com esse nome nesse projeto", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository({
        findCategoryByProjectIdAndName: vi
          .fn()
          .mockResolvedValue(projectCategory),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects/project-1/categories",
      headers: { authorization: authHeader() },
      payload: { name: "Infra interna" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando o nome está vazio", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects/project-1/categories",
      headers: { authorization: authHeader() },
      payload: { name: "" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects/project-1/categories",
      payload: { name: "Infra interna" },
    });

    expect(response.statusCode).toBe(401);
  });
});
