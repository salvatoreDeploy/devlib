import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { CategoriesRepository } from "../services/categories.service";
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

function fakeCategoriesRepository(
  overrides: Partial<CategoriesRepository> = {},
): CategoriesRepository {
  return {
    findGlobalCategories: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("GET /categories", () => {
  it("retorna 200 com as categorias globais", async () => {
    const category = {
      id: "category-1",
      projectId: null,
      name: "Frontend",
      createdAt: new Date("2026-09-03T00:00:00Z"),
    };
    const app = buildServer({
      categoriesRepository: fakeCategoriesRepository({
        findGlobalCategories: vi.fn().mockResolvedValue([category]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/categories",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([{ id: "category-1" }]);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      categoriesRepository: fakeCategoriesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({ method: "GET", url: "/categories" });

    expect(response.statusCode).toBe(401);
  });
});
