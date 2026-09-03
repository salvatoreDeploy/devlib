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

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: "ORM leve, migrations explícitas",
  createdAt: new Date("2026-09-03T00:00:00Z"),
  updatedAt: new Date("2026-09-03T00:00:00Z"),
};

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: new Date("2026-09-03T00:00:00Z"),
};

function fakeLibrariesRepository(
  overrides: Partial<LibrariesRepository> = {},
): LibrariesRepository {
  return {
    insertLibrary: vi.fn().mockResolvedValue(library),
    findLibraries: vi.fn().mockResolvedValue([]),
    findLibraryById: vi.fn().mockResolvedValue(undefined),
    findLibraryByName: vi.fn().mockResolvedValue(undefined),
    updateLibrary: vi.fn().mockResolvedValue(undefined),
    deleteLibrary: vi.fn().mockResolvedValue(undefined),
    findCategoryById: vi.fn().mockResolvedValue(category),
    ...overrides,
  };
}

describe("POST /libraries", () => {
  it("retorna 201 com a biblioteca criada", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      headers: { authorization: authHeader() },
      payload: {
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: "ORM leve, migrations explícitas",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: "library-1",
      name: "drizzle-orm",
    });
  });

  it("retorna 201 sem categoryId (opcional)", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository({
        insertLibrary: vi
          .fn()
          .mockResolvedValue({ ...library, categoryId: null, notes: null }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      headers: { authorization: authHeader() },
      payload: { name: "drizzle-orm" },
    });

    expect(response.statusCode).toBe(201);
  });

  it("retorna 409 quando já existe uma biblioteca com esse nome", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository({
        findLibraryByName: vi.fn().mockResolvedValue(library),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      headers: { authorization: authHeader() },
      payload: { name: "drizzle-orm" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 404 quando o categoryId informado não existe", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository({
        findCategoryById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      headers: { authorization: authHeader() },
      payload: { name: "drizzle-orm", categoryId: "category-x" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando o nome está vazio", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      headers: { authorization: authHeader() },
      payload: { name: "" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      payload: { name: "drizzle-orm" },
    });

    expect(response.statusCode).toBe(401);
  });
});
