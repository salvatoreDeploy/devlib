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
    ...overrides,
  };
}

describe("POST /libraries/:id/tags", () => {
  it("retorna 201 com a tag criada e associada", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries/library-1/tags",
      headers: { authorization: authHeader() },
      payload: { name: "react" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: "tag-1", name: "react" });
  });

  it("retorna 201 reaproveitando uma tag já existente no catálogo", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository({
        findTagByName: vi.fn().mockResolvedValue(tag),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries/library-1/tags",
      headers: { authorization: authHeader() },
      payload: { name: "react" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: "tag-1", name: "react" });
  });

  it("retorna 404 quando a biblioteca não existe", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository({
        findLibraryById: vi.fn().mockResolvedValue(undefined),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries/library-x/tags",
      headers: { authorization: authHeader() },
      payload: { name: "react" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 409 quando a tag já está associada a essa biblioteca", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository({
        findTagByName: vi.fn().mockResolvedValue(tag),
        findLibraryTag: vi
          .fn()
          .mockResolvedValue({ libraryId: "library-1", tagId: "tag-1" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries/library-1/tags",
      headers: { authorization: authHeader() },
      payload: { name: "react" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando o nome está vazio", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries/library-1/tags",
      headers: { authorization: authHeader() },
      payload: { name: "" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      tagsRepository: fakeTagsRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/libraries/library-1/tags",
      payload: { name: "react" },
    });

    expect(response.statusCode).toBe(401);
  });
});
