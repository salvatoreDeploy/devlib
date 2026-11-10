import { describe, it, expect, vi } from "vitest";
import {
  importLibrariesToProject,
  ProjectNotFoundError,
  ProjectLibrariesImportConflictError,
  type ProjectLibrariesImportRepository,
  type ImportLibrariesRepository,
} from "./project-libraries-import.service";

const date = new Date("2026-11-10T00:00:00Z");

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: null,
  createdAt: date,
  updatedAt: date,
};

function catalogLibrary(id: string, name: string) {
  return {
    id,
    name,
    categoryId: null,
    notes: null,
    createdAt: date,
    updatedAt: date,
  };
}

function projectLibraryRow(id: string, name: string, version: string | null) {
  return {
    ...catalogLibrary(id, name),
    version,
    projectCategoryId: null,
  };
}

// catálogo: react (já no projeto, ^18.2.0), zod (já no projeto, ^3.25.0),
// vitest (só no catálogo). "fastify" não existe no catálogo
const react = catalogLibrary("library-react", "react");
const zod = catalogLibrary("library-zod", "zod");
const vitest = catalogLibrary("library-vitest", "vitest");

const projectRows = [
  projectLibraryRow("library-react", "react", "^18.2.0"),
  projectLibraryRow("library-zod", "zod", "^3.25.0"),
];

const items = [
  { name: "fastify", version: "^5.0.0" },
  { name: "vitest", version: "^3.2.0" },
  { name: "react", version: "^18.3.1" },
  { name: "zod", version: "^3.25.0" },
];

type Fakes = ImportLibrariesRepository & {
  findProjectById: ProjectLibrariesImportRepository["findProjectById"];
};

function fakeRepository(overrides: Partial<Fakes> = {}) {
  const inner: Fakes = {
    findProjectById: vi.fn().mockResolvedValue(project),
    findLibrariesByNames: vi.fn().mockResolvedValue([react, zod, vitest]),
    findLibrariesByProjectId: vi.fn().mockResolvedValue(projectRows),
    insertLibrary: vi
      .fn()
      .mockImplementation(async ({ name }: { name: string }) =>
        catalogLibrary(`library-${name}`, name),
      ),
    insertProjectLibrary: vi.fn().mockImplementation(async (data) => ({
      id: `pl-${data.libraryId}`,
      ...data,
      createdAt: date,
    })),
    updateProjectLibrary: vi.fn().mockImplementation(async () => ({})),
    ...overrides,
  };

  const transaction = vi.fn(
    async <T>(fn: (repo: ImportLibrariesRepository) => Promise<T>) => fn(inner),
  );

  const repository: ProjectLibrariesImportRepository = {
    ...inner,
    // vi.fn perde o genérico <T> da assinatura
    transaction: transaction as ProjectLibrariesImportRepository["transaction"],
  };

  return { repository, inner, transaction };
}

const input = {
  userId: "user-1",
  projectId: "project-1",
  items,
};

describe("importLibrariesToProject", () => {
  describe("dryRun", () => {
    it("classifica cada item (nova no catálogo / associar / atualizar versão / sem mudança) sem gravar nada", async () => {
      const { repository, inner, transaction } = fakeRepository();

      const report = await importLibrariesToProject(repository, {
        ...input,
        dryRun: true,
      });

      expect(report).toEqual({
        dryRun: true,
        summary: { create: 1, associate: 1, updateVersion: 1, unchanged: 1 },
        items: [
          {
            name: "fastify",
            version: "^5.0.0",
            action: "create",
            libraryId: null,
            previousVersion: null,
          },
          {
            name: "vitest",
            version: "^3.2.0",
            action: "associate",
            libraryId: "library-vitest",
            previousVersion: null,
          },
          {
            name: "react",
            version: "^18.3.1",
            action: "updateVersion",
            libraryId: "library-react",
            previousVersion: "^18.2.0",
          },
          {
            name: "zod",
            version: "^3.25.0",
            action: "unchanged",
            libraryId: "library-zod",
            previousVersion: "^3.25.0",
          },
        ],
      });
      expect(inner.findLibrariesByNames).toHaveBeenCalledWith([
        "fastify",
        "vitest",
        "react",
        "zod",
      ]);
      expect(inner.findLibrariesByProjectId).toHaveBeenCalledWith("project-1");
      expect(transaction).not.toHaveBeenCalled();
      expect(inner.insertLibrary).not.toHaveBeenCalled();
      expect(inner.insertProjectLibrary).not.toHaveBeenCalled();
      expect(inner.updateProjectLibrary).not.toHaveBeenCalled();
    });

    it("item sem version já associado com versão é 'unchanged' — não apaga a versão existente", async () => {
      const { repository } = fakeRepository();

      const report = await importLibrariesToProject(repository, {
        ...input,
        items: [{ name: "react" }],
        dryRun: true,
      });

      expect(report.items).toEqual([
        {
          name: "react",
          version: null,
          action: "unchanged",
          libraryId: "library-react",
          previousVersion: "^18.2.0",
        },
      ]);
    });

    it("item com version já associado sem versão é 'updateVersion' (previousVersion null)", async () => {
      const { repository } = fakeRepository({
        findLibrariesByProjectId: vi
          .fn()
          .mockResolvedValue([
            projectLibraryRow("library-react", "react", null),
          ]),
      });

      const report = await importLibrariesToProject(repository, {
        ...input,
        items: [{ name: "react", version: "^18.3.1" }],
        dryRun: true,
      });

      expect(report.items[0]).toMatchObject({
        action: "updateVersion",
        previousVersion: null,
      });
    });

    it("compara o nome de forma exata (sensível a maiúsculas)", async () => {
      const { repository } = fakeRepository({
        findLibrariesByNames: vi.fn().mockResolvedValue([]),
      });

      const report = await importLibrariesToProject(repository, {
        ...input,
        items: [{ name: "React", version: "^18.3.1" }],
        dryRun: true,
      });

      expect(report.items[0]).toMatchObject({
        name: "React",
        action: "create",
      });
    });
  });

  describe("aplicação (sem dryRun)", () => {
    it("aplica tudo dentro de uma transação e devolve o relatório com os ids", async () => {
      const { repository, inner, transaction } = fakeRepository();

      const report = await importLibrariesToProject(repository, {
        ...input,
        dryRun: false,
      });

      expect(transaction).toHaveBeenCalledOnce();
      expect(report.dryRun).toBe(false);
      expect(report.summary).toEqual({
        create: 1,
        associate: 1,
        updateVersion: 1,
        unchanged: 1,
      });
      expect(report.items.map((item) => [item.name, item.libraryId])).toEqual([
        ["fastify", "library-fastify"],
        ["vitest", "library-vitest"],
        ["react", "library-react"],
        ["zod", "library-zod"],
      ]);

      // nova no catálogo: criada sem categoria e associada
      expect(inner.insertLibrary).toHaveBeenCalledOnce();
      expect(inner.insertLibrary).toHaveBeenCalledWith({ name: "fastify" });
      expect(inner.insertProjectLibrary).toHaveBeenCalledWith({
        projectId: "project-1",
        libraryId: "library-fastify",
        version: "^5.0.0",
        categoryId: null,
      });
      // já no catálogo: só associada
      expect(inner.insertProjectLibrary).toHaveBeenCalledWith({
        projectId: "project-1",
        libraryId: "library-vitest",
        version: "^3.2.0",
        categoryId: null,
      });
      expect(inner.insertProjectLibrary).toHaveBeenCalledTimes(2);
      // já associada: só a version
      expect(inner.updateProjectLibrary).toHaveBeenCalledOnce();
      expect(inner.updateProjectLibrary).toHaveBeenCalledWith(
        "project-1",
        "library-react",
        { version: "^18.3.1" },
      );
    });

    it("lê catálogo e projeto pelo repositório da transação, não pelo de fora", async () => {
      const outerFind = vi.fn();
      const { repository, inner } = fakeRepository();
      repository.findLibrariesByNames = outerFind;
      repository.findLibrariesByProjectId = outerFind;

      await importLibrariesToProject(repository, { ...input, dryRun: false });

      expect(outerFind).not.toHaveBeenCalled();
      expect(inner.findLibrariesByNames).toHaveBeenCalledOnce();
      expect(inner.findLibrariesByProjectId).toHaveBeenCalledOnce();
    });

    it("associação nova sem version grava null", async () => {
      const { repository, inner } = fakeRepository();

      await importLibrariesToProject(repository, {
        ...input,
        items: [{ name: "vitest" }],
        dryRun: false,
      });

      expect(inner.insertProjectLibrary).toHaveBeenCalledWith({
        projectId: "project-1",
        libraryId: "library-vitest",
        version: null,
        categoryId: null,
      });
    });

    it("unique violation (corrida com outra requisição) vira ProjectLibrariesImportConflictError", async () => {
      const uniqueViolation = Object.assign(new Error("duplicate key"), {
        code: "23505",
      });
      const { repository } = fakeRepository({
        insertLibrary: vi.fn().mockRejectedValue(uniqueViolation),
      });

      await expect(
        importLibrariesToProject(repository, { ...input, dryRun: false }),
      ).rejects.toBeInstanceOf(ProjectLibrariesImportConflictError);
    });

    it("outros erros do banco seguem sem tradução", async () => {
      const boom = new Error("conexão caiu");
      const { repository } = fakeRepository({
        updateProjectLibrary: vi.fn().mockRejectedValue(boom),
      });

      await expect(
        importLibrariesToProject(repository, { ...input, dryRun: false }),
      ).rejects.toBe(boom);
    });
  });

  describe("posse do projeto", () => {
    it.each([
      ["não existe", undefined],
      ["é de outro usuário", { ...project, userId: "user-2" }],
    ])(
      "lança ProjectNotFoundError quando o projeto %s, sem ler catálogo nem abrir transação",
      async (_case, found) => {
        const { repository, inner, transaction } = fakeRepository({
          findProjectById: vi.fn().mockResolvedValue(found),
        });

        for (const dryRun of [true, false]) {
          await expect(
            importLibrariesToProject(repository, { ...input, dryRun }),
          ).rejects.toBeInstanceOf(ProjectNotFoundError);
        }
        expect(inner.findLibrariesByNames).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
      },
    );
  });
});
