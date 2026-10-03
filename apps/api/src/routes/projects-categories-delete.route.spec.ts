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

const globalCategory = {
  id: "category-1",
  projectId: null,
  name: "Frontend",
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
    findCategoryById: vi.fn().mockResolvedValue(projectCategory),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DELETE /projects/:id/categories/:categoryId", () => {
  it("retorna 204 quando exclui com sucesso", async () => {
    const repository = fakeRepository();
    const app = buildServer({
      projectsCategoriesRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1/categories/category-2",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(204);
    expect(repository.deleteCategory).toHaveBeenCalledWith("category-2");
  });

  it("retorna 404 quando o projeto não existe, sem excluir", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });
    const app = buildServer({
      projectsCategoriesRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-x/categories/category-2",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o projeto é de outro usuário, sem excluir", async () => {
    const repository = fakeRepository({
      findProjectById: vi
        .fn()
        .mockResolvedValue({ ...project, userId: "outro-usuario" }),
    });
    const app = buildServer({
      projectsCategoriesRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1/categories/category-2",
      headers: { authorization: authHeader("user-1") },
    });

    expect(response.statusCode).toBe(404);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a categoria não existe, sem excluir", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(undefined),
    });
    const app = buildServer({
      projectsCategoriesRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1/categories/category-x",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a categoria é global, sem excluir", async () => {
    const repository = fakeRepository({
      findCategoryById: vi.fn().mockResolvedValue(globalCategory),
    });
    const app = buildServer({
      projectsCategoriesRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1/categories/category-1",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a categoria pertence a outro projeto, sem excluir", async () => {
    const repository = fakeRepository({
      findCategoryById: vi
        .fn()
        .mockResolvedValue({ ...projectCategory, projectId: "project-2" }),
    });
    const app = buildServer({
      projectsCategoriesRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1/categories/category-2",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      projectsCategoriesRepository: fakeRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/projects/project-1/categories/category-2",
    });

    expect(response.statusCode).toBe(401);
  });
});
