import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { libraries, projectLibraries } from "@devlib/db";
import { buildServer } from "../server";
import { createProjectLibrariesImportRepository } from "./projects-libraries-import.route";
import {
  importLibrariesToProject,
  type ImportLibrariesRepository,
  type ProjectLibrariesImportRepository,
} from "../services/project-libraries-import.service";
import { getTestDb, insertLibrary } from "../../test/integration/test-db";
import { bearer, createProject, signUp } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

type App = ReturnType<typeof buildServer>;

function importLibraries(
  app: App,
  token: string,
  projectId: string,
  payload: {
    items: { name: string; version?: string }[];
    dryRun?: boolean;
  },
) {
  return app.inject({
    method: "POST",
    url: `/projects/${projectId}/libraries/import`,
    headers: bearer(token),
    payload,
  });
}

function associate(
  app: App,
  token: string,
  projectId: string,
  libraryId: string,
  version?: string,
) {
  return app.inject({
    method: "POST",
    url: `/projects/${projectId}/libraries`,
    headers: bearer(token),
    payload: { libraryId, version },
  });
}

async function catalogNames() {
  const rows = await getTestDb()
    .select({ name: libraries.name })
    .from(libraries)
    .orderBy(libraries.name);

  return rows.map((row) => row.name);
}

async function projectVersions(projectId: string) {
  const rows = await getTestDb()
    .select({ name: libraries.name, version: projectLibraries.version })
    .from(projectLibraries)
    .innerJoin(libraries, eq(projectLibraries.libraryId, libraries.id))
    .where(eq(projectLibraries.projectId, projectId))
    .orderBy(libraries.name);

  return rows;
}

// catálogo: react, zod, vitest. Projeto: react@^18.2.0, zod@^3.25.0
async function setup() {
  const app = buildServer();
  const ana = await signUp(app, "ana@example.com", PASSWORD);
  const project = await createProject(app, ana.accessToken, "DevLib");
  const react = await insertLibrary("react");
  const zod = await insertLibrary("zod");
  await insertLibrary("vitest");

  expect(
    (await associate(app, ana.accessToken, project.id, react.id, "^18.2.0"))
      .statusCode,
  ).toBe(201);
  expect(
    (await associate(app, ana.accessToken, project.id, zod.id, "^3.25.0"))
      .statusCode,
  ).toBe(201);

  return { app, ana, project };
}

const items = [
  { name: "fastify", version: "^5.0.0" },
  { name: "vitest", version: "^3.2.0" },
  { name: "react", version: "^18.3.1" },
  { name: "zod", version: "^3.25.0" },
];

describe("importação de bibliotecas no projeto (Postgres real)", () => {
  it("dryRun classifica cada item e não grava nada", async () => {
    const { app, ana, project } = await setup();

    const response = await importLibraries(app, ana.accessToken, project.id, {
      items,
      dryRun: true,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().summary).toEqual({
      create: 1,
      associate: 1,
      updateVersion: 1,
      unchanged: 1,
    });
    expect(
      response.json().items.map((item: { action: string }) => item.action),
    ).toEqual(["create", "associate", "updateVersion", "unchanged"]);
    expect(await catalogNames()).toEqual(["react", "vitest", "zod"]);
    expect(await projectVersions(project.id)).toEqual([
      { name: "react", version: "^18.2.0" },
      { name: "zod", version: "^3.25.0" },
    ]);
  });

  it("sem dryRun cria, associa e atualiza a versão; reimportar a mesma lista fica tudo 'unchanged'", async () => {
    const { app, ana, project } = await setup();

    const applied = await importLibraries(app, ana.accessToken, project.id, {
      items,
    });

    expect(applied.statusCode).toBe(200);
    expect(applied.json().dryRun).toBe(false);
    expect(await catalogNames()).toEqual(["fastify", "react", "vitest", "zod"]);
    expect(await projectVersions(project.id)).toEqual([
      { name: "fastify", version: "^5.0.0" },
      { name: "react", version: "^18.3.1" },
      { name: "vitest", version: "^3.2.0" },
      { name: "zod", version: "^3.25.0" },
    ]);

    const [fastify] = await getTestDb()
      .select()
      .from(libraries)
      .where(eq(libraries.name, "fastify"));
    expect(fastify.categoryId).toBeNull();

    const again = await importLibraries(app, ana.accessToken, project.id, {
      items,
      dryRun: true,
    });
    expect(again.json().summary).toEqual({
      create: 0,
      associate: 0,
      updateVersion: 0,
      unchanged: 4,
    });
  });

  it("item sem version não apaga a versão de uma associação existente", async () => {
    const { app, ana, project } = await setup();

    await importLibraries(app, ana.accessToken, project.id, {
      items: [{ name: "react" }],
    });

    expect(await projectVersions(project.id)).toContainEqual({
      name: "react",
      version: "^18.2.0",
    });
  });

  it("responde 404 para projeto de outro usuário e não grava nada", async () => {
    const { app, project } = await setup();
    const bruno = await signUp(app, "bruno@example.com", PASSWORD);

    const response = await importLibraries(app, bruno.accessToken, project.id, {
      items,
    });

    expect(response.statusCode).toBe(404);
    expect(await catalogNames()).toEqual(["react", "vitest", "zod"]);
  });

  it("se um passo falhar no meio, a transação desfaz tudo (nem a lib criada antes fica)", async () => {
    const { ana, project } = await setup();
    const real = createProjectLibrariesImportRepository(getTestDb());
    const failure = new Error("falha simulada no update");

    // react (updateVersion) vem depois de fastify (create) e vitest (associate)
    const failing: ProjectLibrariesImportRepository = {
      ...real,
      transaction: <T>(fn: (repo: ImportLibrariesRepository) => Promise<T>) =>
        real.transaction((tx) =>
          fn({
            ...tx,
            updateProjectLibrary: async () => {
              throw failure;
            },
          }),
        ),
    };

    await expect(
      importLibrariesToProject(failing, {
        userId: ana.userId,
        projectId: project.id,
        items,
        dryRun: false,
      }),
    ).rejects.toBe(failure);

    expect(await catalogNames()).toEqual(["react", "vitest", "zod"]);
    expect(await projectVersions(project.id)).toEqual([
      { name: "react", version: "^18.2.0" },
      { name: "zod", version: "^3.25.0" },
    ]);
  });
});
