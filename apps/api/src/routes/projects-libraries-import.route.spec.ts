import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type {
  ImportLibrariesRepository,
  ProjectLibrariesImportRepository,
} from "../services/project-libraries-import.service";
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

const date = new Date("2026-11-10T00:00:00Z");

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: null,
  createdAt: date,
  updatedAt: date,
};

const react = {
  id: "library-react",
  name: "react",
  categoryId: null,
  notes: null,
  createdAt: date,
  updatedAt: date,
};

function fakeRepository(
  overrides: Partial<ProjectLibrariesImportRepository> = {},
): ProjectLibrariesImportRepository {
  const inner: ImportLibrariesRepository = {
    findLibrariesByNames: vi.fn().mockResolvedValue([react]),
    findLibrariesByProjectId: vi.fn().mockResolvedValue([]),
    insertLibrary: vi.fn().mockImplementation(async ({ name }) => ({
      ...react,
      id: `library-${name}`,
      name,
    })),
    insertProjectLibrary: vi.fn().mockImplementation(async (data) => ({
      id: "pl-1",
      ...data,
      createdAt: date,
    })),
    updateProjectLibrary: vi.fn(),
  };

  return {
    ...inner,
    findProjectById: vi.fn().mockResolvedValue(project),
    transaction: vi.fn(async (fn) => fn(inner)),
    ...overrides,
  };
}

function importLibraries(
  repository: ProjectLibrariesImportRepository,
  payload: unknown,
  headers: Record<string, string> = { authorization: authHeader() },
) {
  const app = buildServer({
    projectLibrariesImportRepository: repository,
    authConfig: fakeAuthConfig,
  });

  return app.inject({
    method: "POST",
    url: "/projects/project-1/libraries/import",
    headers,
    payload: payload as Record<string, unknown>,
  });
}

describe("POST /projects/:id/libraries/import", () => {
  it("com dryRun responde 200 com a classificação e não abre transação", async () => {
    const repository = fakeRepository();

    const response = await importLibraries(repository, {
      items: [{ name: "fastify", version: "^5.0.0" }, { name: "react" }],
      dryRun: true,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      dryRun: true,
      summary: { create: 1, associate: 1, updateVersion: 0, unchanged: 0 },
      items: [
        {
          name: "fastify",
          version: "^5.0.0",
          action: "create",
          libraryId: null,
          previousVersion: null,
        },
        {
          name: "react",
          version: null,
          action: "associate",
          libraryId: "library-react",
          previousVersion: null,
        },
      ],
    });
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it("sem dryRun (padrão false) aplica numa transação e responde 200 com o relatório", async () => {
    const repository = fakeRepository();

    const response = await importLibraries(repository, {
      items: [{ name: "fastify", version: "^5.0.0" }],
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      dryRun: false,
      summary: { create: 1, associate: 0, updateVersion: 0, unchanged: 0 },
      items: [
        { name: "fastify", action: "create", libraryId: "library-fastify" },
      ],
    });
    expect(repository.transaction).toHaveBeenCalledOnce();
  });

  it("remove espaços nas pontas de name e version", async () => {
    const repository = fakeRepository({
      findLibrariesByNames: vi.fn().mockResolvedValue([]),
    });

    const response = await importLibraries(repository, {
      items: [{ name: "  fastify ", version: " ^5.0.0 " }],
      dryRun: true,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items[0]).toMatchObject({
      name: "fastify",
      version: "^5.0.0",
    });
    expect(repository.findLibrariesByNames).toHaveBeenCalledWith(["fastify"]);
  });

  it("responde 404 quando o projeto não existe ou é de outro usuário", async () => {
    const repository = fakeRepository({
      findProjectById: vi
        .fn()
        .mockResolvedValue({ ...project, userId: "user-2" }),
    });

    const response = await importLibraries(repository, {
      items: [{ name: "react" }],
      dryRun: true,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Projeto não encontrado" });
  });

  it("responde 409 quando o catálogo/projeto mudou no meio da importação (unique violation)", async () => {
    const uniqueViolation = Object.assign(new Error("duplicate key"), {
      code: "23505",
    });
    const repository = fakeRepository({
      transaction: vi.fn().mockRejectedValue(uniqueViolation),
    });

    const response = await importLibraries(repository, {
      items: [{ name: "fastify" }],
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toMatch(/tente de novo/i);
  });

  it("responde 401 sem token", async () => {
    const repository = fakeRepository();

    const response = await importLibraries(
      repository,
      { items: [{ name: "react" }] },
      {},
    );

    expect(response.statusCode).toBe(401);
    expect(repository.findProjectById).not.toHaveBeenCalled();
  });

  describe("validação (400)", () => {
    it.each([
      ["sem items", {}],
      ["items vazio", { items: [] }],
      ["name vazio", { items: [{ name: "" }] }],
      ["name só com espaços", { items: [{ name: "   " }] }],
      ["name acima de 214 caracteres", { items: [{ name: "a".repeat(215) }] }],
      ["version vazia", { items: [{ name: "react", version: "" }] }],
      ["version só com espaços", { items: [{ name: "react", version: "  " }] }],
      [
        "version acima de 100 caracteres",
        { items: [{ name: "react", version: "1".repeat(101) }] },
      ],
      ["dryRun não booleano", { items: [{ name: "react" }], dryRun: "sim" }],
      [
        "mais de 500 itens",
        {
          items: Array.from({ length: 501 }, (_, i) => ({ name: `lib-${i}` })),
        },
      ],
    ])("%s", async (_case, payload) => {
      const repository = fakeRepository();

      const response = await importLibraries(repository, payload);

      expect(response.statusCode).toBe(400);
      expect(repository.findProjectById).not.toHaveBeenCalled();
    });

    it("aceita exatamente 500 itens", async () => {
      const repository = fakeRepository({
        findLibrariesByNames: vi.fn().mockResolvedValue([]),
      });

      const response = await importLibraries(repository, {
        items: Array.from({ length: 500 }, (_, i) => ({ name: `lib-${i}` })),
        dryRun: true,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().summary.create).toBe(500);
    });

    it("rejeita nome repetido (comparado após trim) citando o nome na mensagem", async () => {
      const repository = fakeRepository();

      const response = await importLibraries(repository, {
        items: [{ name: "react" }, { name: "zod" }, { name: " react " }],
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain("react");
      expect(repository.findProjectById).not.toHaveBeenCalled();
    });
  });
});
