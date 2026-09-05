import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { TagsRepository } from "../services/tags.service";
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

const tag = {
  id: "tag-1",
  name: "react",
  createdAt: new Date("2026-09-05T00:00:00Z"),
};

function fakeTagsRepository(
  overrides: Partial<TagsRepository> = {},
): TagsRepository {
  return {
    findLibraryById: vi.fn().mockResolvedValue(library),
    findTagByName: vi.fn().mockResolvedValue(undefined),
    insertTag: vi.fn().mockResolvedValue(tag),
    findLibraryTag: vi.fn().mockResolvedValue(undefined),
    insertLibraryTag: vi.fn().mockResolvedValue(undefined),
    findTagsByLibraryId: vi.fn().mockResolvedValue([tag]),
    ...overrides,
  };
}

describe("GET /libraries/:id/tags", () => {
  it("retorna 200 com as tags da biblioteca", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-1/tags",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([{ id: "tag-1", name: "react" }]);
  });

  it("retorna 200 com array vazio quando a biblioteca não tem tags", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository({
        findTagsByLibraryId: vi.fn().mockResolvedValue([]),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-1/tags",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("retorna 404 quando a biblioteca não existe", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository({
        findLibraryById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-x/tags",
      headers: { authorization: authHeader() },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/libraries/library-1/tags",
    });

    expect(response.statusCode).toBe(401);
  });
});
