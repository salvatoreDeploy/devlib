import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { LibrariesCatalogRepository } from "../services/libraries-catalog.service";
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

const date = new Date("2026-11-11T00:00:00Z");
const UUID = "6f1c2a4e-8b3d-4c5e-9f00-112233445566";

function fakeRepository(
  overrides: Partial<LibrariesCatalogRepository> = {},
): LibrariesCatalogRepository {
  return {
    findLibrariesCatalog: vi.fn().mockResolvedValue({
      items: [
        {
          id: "library-react",
          name: "react",
          categoryId: null,
          notes: null,
          createdAt: date,
          updatedAt: date,
          projectsCount: 1,
        },
      ],
      total: 1,
    }),
    findEffectiveCategories: vi.fn().mockResolvedValue([
      {
        libraryId: "library-react",
        categoryId: "cat-front",
        categoryName: "Frontend",
        projectId: "p-1",
        projectName: "DevLib",
      },
    ]),
    ...overrides,
  };
}

function getCatalog(
  repository: LibrariesCatalogRepository,
  query = "",
  headers: Record<string, string> = { authorization: authHeader() },
) {
  const app = buildServer({
    librariesCatalogRepository: repository,
    authConfig: fakeAuthConfig,
  });
  return app.inject({
    method: "GET",
    url: `/libraries/catalog${query}`,
    headers,
  });
}

describe("GET /libraries/catalog", () => {
  it("responde 200 com { items, total, page, pageSize } e as categorias efetivas de cada biblioteca", async () => {
    const repository = fakeRepository();

    const response = await getCatalog(repository);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          id: "library-react",
          name: "react",
          categoryId: null,
          notes: null,
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
          projectsCount: 1,
          effectiveCategories: [
            {
              id: "cat-front",
              name: "Frontend",
              projects: [{ id: "p-1", name: "DevLib" }],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(repository.findLibrariesCatalog).toHaveBeenCalledWith(
      "user-1",
      { usage: "all" },
      { limit: 10, offset: 0 },
    );
  });

  it("repassa os filtros validados (q com trim, categoryId, usage, tagId) e a página", async () => {
    const repository = fakeRepository({
      findLibrariesCatalog: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    });

    await getCatalog(
      repository,
      `?q=%20react%20&categoryId=${UUID}&usage=used&tagId=${UUID}&page=3`,
    );

    expect(repository.findLibrariesCatalog).toHaveBeenCalledWith(
      "user-1",
      { q: "react", categoryId: UUID, usage: "used", tagId: UUID },
      { limit: 10, offset: 20 },
    );
  });

  it("aceita categoryId=none (sem categoria)", async () => {
    const repository = fakeRepository({
      findLibrariesCatalog: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    });

    const response = await getCatalog(repository, "?categoryId=none");

    expect(response.statusCode).toBe(200);
    expect(repository.findLibrariesCatalog).toHaveBeenCalledWith(
      "user-1",
      { categoryId: "none", usage: "all" },
      { limit: 10, offset: 0 },
    );
  });

  it("q vazio ou só espaços é ignorado", async () => {
    const repository = fakeRepository();

    await getCatalog(repository, "?q=%20%20");

    expect(repository.findLibrariesCatalog).toHaveBeenCalledWith(
      "user-1",
      { usage: "all" },
      { limit: 10, offset: 0 },
    );
  });

  describe("validação (400)", () => {
    it.each([
      ["categoryId que não é UUID nem 'none'", "?categoryId=abc"],
      ["tagId que não é UUID", "?tagId=abc"],
      ["usage desconhecido", "?usage=talvez"],
      ["page zero", "?page=0"],
      ["page negativa", "?page=-1"],
      ["page não inteira", "?page=1.5"],
      ["page não numérica", "?page=abc"],
      ["q acima de 100 caracteres", `?q=${"a".repeat(101)}`],
    ])("%s", async (_case, query) => {
      const repository = fakeRepository();

      const response = await getCatalog(repository, query);

      expect(response.statusCode).toBe(400);
      expect(repository.findLibrariesCatalog).not.toHaveBeenCalled();
    });
  });

  it("responde 401 sem token", async () => {
    const repository = fakeRepository();

    const response = await getCatalog(repository, "", {});

    expect(response.statusCode).toBe(401);
    expect(repository.findLibrariesCatalog).not.toHaveBeenCalled();
  });
});
