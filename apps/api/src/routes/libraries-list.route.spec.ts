import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { LibrariesRepository } from "../services/libraries.service";
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

function fakeLibrariesRepository(
  overrides: Partial<LibrariesRepository> = {},
): LibrariesRepository {
  return {
    insertLibrary: vi.fn().mockResolvedValue(undefined),
    findLibraries: vi.fn().mockResolvedValue([]),
    findLibraryById: vi.fn().mockResolvedValue(undefined),
    findLibraryByName: vi.fn().mockResolvedValue(undefined),
    updateLibrary: vi.fn().mockResolvedValue(undefined),
    deleteLibrary: vi.fn().mockResolvedValue(undefined),
    findCategoryById: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("GET /libraries", () => {
  it("retorna 200 com todas as bibliotecas do catálogo", async () => {
    const library = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: null,
      createdAt: new Date("2026-09-03T00:00:00Z"),
      updatedAt: new Date("2026-09-03T00:00:00Z"),
    };
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository({
        findLibraries: vi.fn().mockResolvedValue([library]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([{ id: "library-1" }]);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({ method: "GET", url: "/libraries" });

    expect(response.statusCode).toBe(401);
  });
});
