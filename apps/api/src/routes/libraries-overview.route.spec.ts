import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { LibrariesOverviewRepository } from "../services/libraries.service";
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

function fakeLibrariesOverviewRepository(
  overrides: Partial<LibrariesOverviewRepository> = {},
): LibrariesOverviewRepository {
  return {
    findLibrariesOverview: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("GET /libraries/overview", () => {
  it("retorna 200 com as bibliotecas do catálogo e o projectsCount do usuário autenticado", async () => {
    const overview = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: null,
      createdAt: new Date("2026-09-03T00:00:00Z"),
      updatedAt: new Date("2026-09-03T00:00:00Z"),
      projectsCount: 2,
    };
    const app = buildServer({
      librariesOverviewRepository: fakeLibrariesOverviewRepository({
        findLibrariesOverview: vi.fn().mockResolvedValue([overview]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/overview",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([
      { id: "library-1", projectsCount: 2 },
    ]);
  });

  it("retorna array vazio quando o catálogo está vazio", async () => {
    const app = buildServer({
      librariesOverviewRepository: fakeLibrariesOverviewRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/overview",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      librariesOverviewRepository: fakeLibrariesOverviewRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/overview",
    });

    expect(response.statusCode).toBe(401);
  });
});
