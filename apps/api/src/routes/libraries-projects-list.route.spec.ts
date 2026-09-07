import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { LibraryProjectsRepository } from "../services/libraries.service";
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

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: null,
  createdAt: new Date("2026-09-03T00:00:00Z"),
  updatedAt: new Date("2026-09-03T00:00:00Z"),
};

const projectAssociation = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: null,
  version: "1.2.3",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function fakeLibrariesProjectsRepository(
  overrides: Partial<LibraryProjectsRepository> = {},
): LibraryProjectsRepository {
  return {
    insertLibrary: vi.fn().mockResolvedValue(library),
    findLibraries: vi.fn().mockResolvedValue([library]),
    findLibraryById: vi.fn().mockResolvedValue(library),
    findLibraryByName: vi.fn().mockResolvedValue(undefined),
    updateLibrary: vi.fn().mockResolvedValue(library),
    deleteLibrary: vi.fn().mockResolvedValue(undefined),
    findCategoryById: vi.fn().mockResolvedValue(undefined),
    findLibrariesByProjectId: vi.fn().mockResolvedValue([]),
    findProjectsByLibraryId: vi.fn().mockResolvedValue([projectAssociation]),
    ...overrides,
  };
}

describe("GET /libraries/:id/projects", () => {
  it("retorna 200 com os projetos do usuário autenticado que usam a biblioteca", async () => {
    const app = buildServer({
      librariesProjectsRepository: fakeLibrariesProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-1/projects",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([
      { id: "project-1", name: "DevLib", version: "1.2.3" },
    ]);
  });

  it("retorna 200 com array vazio quando nenhum projeto do usuário usa a biblioteca", async () => {
    const app = buildServer({
      librariesProjectsRepository: fakeLibrariesProjectsRepository({
        findProjectsByLibraryId: vi.fn().mockResolvedValue([]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-1/projects",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("retorna 404 quando a biblioteca não existe", async () => {
    const app = buildServer({
      librariesProjectsRepository: fakeLibrariesProjectsRepository({
        findLibraryById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-x/projects",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      librariesProjectsRepository: fakeLibrariesProjectsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-1/projects",
    });

    expect(response.statusCode).toBe(401);
  });
});
