import { describe, expect, it } from "vitest";
import { projectLibraries } from "@devlib/db";
import { buildServer } from "../server";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createProjectLibrariesRepository } from "../repositories/project-libraries.repository";
import { getTestDb, insertLibrary } from "../../test/integration/test-db";
import { bearer, createProject, signUp } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

type App = ReturnType<typeof buildServer>;

function associate(
  app: App,
  token: string,
  projectId: string,
  payload: { libraryId: string; version?: string },
) {
  return app.inject({
    method: "POST",
    url: `/projects/${projectId}/libraries`,
    headers: bearer(token),
    payload,
  });
}

function listProjectLibraries(app: App, token: string, projectId: string) {
  return app.inject({
    method: "GET",
    url: `/projects/${projectId}/libraries`,
    headers: bearer(token),
  });
}

function remove(app: App, token: string, projectId: string, libraryId: string) {
  return app.inject({
    method: "DELETE",
    url: `/projects/${projectId}/libraries/${libraryId}`,
    headers: bearer(token),
  });
}

async function setup(app: App = buildServer()) {
  const ana = await signUp(app, "ana@example.com", PASSWORD);
  const project = await createProject(app, ana.accessToken, "DevLib");
  const library = await insertLibrary("react");

  return { app, ana, project, library };
}

describe("associação biblioteca ↔ projeto (Postgres real)", () => {
  it("POST associa, GET /projects/:id/libraries mostra a version e DELETE remove", async () => {
    const { app, ana, project, library } = await setup();

    const created = await associate(app, ana.accessToken, project.id, {
      libraryId: library.id,
      version: " 18.3.1 ",
    });
    const listed = await listProjectLibraries(app, ana.accessToken, project.id);

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      projectId: project.id,
      libraryId: library.id,
      version: "18.3.1",
    });
    expect(listed.json()).toEqual([
      expect.objectContaining({ id: library.id, version: "18.3.1" }),
    ]);

    const removed = await remove(app, ana.accessToken, project.id, library.id);
    const afterRemove = await listProjectLibraries(
      app,
      ana.accessToken,
      project.id,
    );

    expect(removed.statusCode).toBe(204);
    expect(afterRemove.json()).toEqual([]);
  });

  it("associar a mesma biblioteca de novo responde 409 e não troca a version", async () => {
    const { app, ana, project, library } = await setup();
    await associate(app, ana.accessToken, project.id, {
      libraryId: library.id,
      version: "18.3.1",
    });

    const second = await associate(app, ana.accessToken, project.id, {
      libraryId: library.id,
      version: "19.0.0",
    });

    expect(second.statusCode).toBe(409);
    expect(await getTestDb().select().from(projectLibraries)).toEqual([
      expect.objectContaining({ version: "18.3.1" }),
    ]);
  });

  it("corrida associando o mesmo par (os dois passam pela checagem do service) retorna 409 via 23505, não 500", async () => {
    const db = getTestDb();
    // simula a corrida de forma determinística: a checagem prévia nunca vê
    // a outra associação, então o segundo insert bate no unique real do banco
    const app = buildServer({
      projectLibraryAssociationsRepository: {
        ...createProjectsRepository(db),
        ...createLibrariesRepository(db),
        ...createProjectLibrariesRepository(db),
        findProjectLibrary: async () => undefined,
      },
    });
    const { ana, project, library } = await setup(app);

    const first = await associate(app, ana.accessToken, project.id, {
      libraryId: library.id,
    });
    const second = await associate(app, ana.accessToken, project.id, {
      libraryId: library.id,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(await db.select().from(projectLibraries)).toHaveLength(1);
  });

  it("projeto de outro usuário responde 404 no POST e no DELETE, sem gravar nem remover", async () => {
    const { app, ana, project, library } = await setup();
    const bia = await signUp(app, "bia@example.com", PASSWORD);
    await associate(app, ana.accessToken, project.id, {
      libraryId: library.id,
    });

    const post = await associate(app, bia.accessToken, project.id, {
      libraryId: library.id,
    });
    const del = await remove(app, bia.accessToken, project.id, library.id);

    expect(post.statusCode).toBe(404);
    expect(del.statusCode).toBe(404);
    expect(await getTestDb().select().from(projectLibraries)).toHaveLength(1);
  });

  it("biblioteca inexistente responde 404 no POST; DELETE de biblioteca não associada responde 404", async () => {
    const { app, ana, project, library } = await setup();

    const post = await associate(app, ana.accessToken, project.id, {
      libraryId: "00000000-0000-0000-0000-000000000000",
    });
    const del = await remove(app, ana.accessToken, project.id, library.id);

    expect(post.statusCode).toBe(404);
    expect(del.statusCode).toBe(404);
  });
});
