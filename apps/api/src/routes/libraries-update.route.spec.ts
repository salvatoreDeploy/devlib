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
    insertLibrary: vi.fn().mockResolvedValue(undefined),
    findLibraries: vi.fn().mockResolvedValue([]),
    findLibraryById: vi.fn().mockResolvedValue(library),
    findLibraryByName: vi.fn().mockResolvedValue(undefined),
    updateLibrary: vi
      .fn()
      .mockResolvedValue({ ...library, notes: "nota nova" }),
    deleteLibrary: vi.fn().mockResolvedValue(undefined),
    findCategoryById: vi.fn().mockResolvedValue(category),
    ...overrides,
  };
}

describe("PATCH /libraries/:id", () => {
  it("retorna 200 com a biblioteca atualizada", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/libraries/library-1",
      headers: { authorization: authHeader() },
      payload: { notes: "nota nova" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ notes: "nota nova" });
  });

  it("retorna 404 quando a biblioteca não existe", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository({
        findLibraryById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/libraries/library-x",
      headers: { authorization: authHeader() },
      payload: { notes: "nota nova" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 409 quando o novo nome já é usado por outra biblioteca", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository({
        findLibraryByName: vi
          .fn()
          .mockResolvedValue({ ...library, id: "library-2", name: "Outro" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/libraries/library-1",
      headers: { authorization: authHeader() },
      payload: { name: "Outro" },
    });

    expect(response.statusCode).toBe(409);
  });

  it("retorna 404 quando o novo categoryId não existe", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository({
        findCategoryById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/libraries/library-1",
      headers: { authorization: authHeader() },
      payload: { categoryId: "category-x" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      librariesRepository: fakeLibrariesRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/libraries/library-1",
      payload: { notes: "nota nova" },
    });

    expect(response.statusCode).toBe(401);
  });
});
