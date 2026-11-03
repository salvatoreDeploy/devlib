import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { categories, libraries, tags } from "@devlib/db";
import { buildServer } from "../server";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createTagsRepository } from "../repositories/tags.repository";
import { getTestDb } from "../../test/integration/test-db";
import { bearer, createProject, signUp } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

type App = ReturnType<typeof buildServer>;

function createLibrary(app: App, token: string, name: string) {
  return app.inject({
    method: "POST",
    url: "/libraries",
    headers: bearer(token),
    payload: { name },
  });
}

function addTag(app: App, token: string, libraryId: string, name: string) {
  return app.inject({
    method: "POST",
    url: `/libraries/${libraryId}/tags`,
    headers: bearer(token),
    payload: { name },
  });
}

function librariesRepositoryWithoutNameCheck() {
  const db = getTestDb();

  return {
    ...createLibrariesRepository(db),
    ...createCategoriesRepository(db),
    findLibraryByName: async () => undefined,
  };
}

describe("bibliotecas e tags — corridas de unique (Postgres real)", () => {
  it("POST /libraries com o mesmo nome (os dois passam pela checagem) retorna 409 via 23505, não 500", async () => {
    const app = buildServer({
      librariesRepository: librariesRepositoryWithoutNameCheck(),
    });
    const ana = await signUp(app, "ana@example.com", PASSWORD);

    const first = await createLibrary(app, ana.accessToken, "zod");
    const second = await createLibrary(app, ana.accessToken, "zod");

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(await getTestDb().select().from(libraries)).toHaveLength(1);
  });

  it("PATCH /libraries/:id pro nome de outra biblioteca (sem checagem prévia) retorna 409 via 23505", async () => {
    const app = buildServer({
      librariesRepository: librariesRepositoryWithoutNameCheck(),
    });
    const ana = await signUp(app, "ana@example.com", PASSWORD);
    await createLibrary(app, ana.accessToken, "zod");
    const yup = (await createLibrary(app, ana.accessToken, "yup")).json<{
      id: string;
    }>();

    const rename = await app.inject({
      method: "PATCH",
      url: `/libraries/${yup.id}`,
      headers: bearer(ana.accessToken),
      payload: { name: "zod" },
    });

    expect(rename.statusCode).toBe(409);
  });

  it("corrida criando a mesma tag nova reaproveita a tag criada pela outra requisição (201, uma linha em tags)", async () => {
    const db = getTestDb();
    const tagsRepository = {
      ...createTagsRepository(db),
      ...createLibrariesRepository(db),
    };
    const realFindTagByName = tagsRepository.findTagByName;
    let firstLookup = true;
    // a primeira busca "perde" a tag criada pela requisição concorrente; as
    // seguintes (inclusive a nova busca depois do 23505) usam o banco real
    tagsRepository.findTagByName = async (name: string) => {
      if (firstLookup) {
        firstLookup = false;
        return undefined;
      }
      return realFindTagByName(name);
    };
    const setupApp = buildServer();
    const ana = await signUp(setupApp, "ana@example.com", PASSWORD);
    const zod = (await createLibrary(setupApp, ana.accessToken, "zod")).json<{
      id: string;
    }>();
    const yup = (await createLibrary(setupApp, ana.accessToken, "yup")).json<{
      id: string;
    }>();
    await addTag(setupApp, ana.accessToken, zod.id, "validation");

    const app = buildServer({ tagsRepository });
    const response = await addTag(app, ana.accessToken, yup.id, "validation");

    expect(response.statusCode).toBe(201);
    expect(await db.select().from(tags)).toHaveLength(1);
    const yupTags = await app.inject({
      method: "GET",
      url: `/libraries/${yup.id}/tags`,
      headers: bearer(ana.accessToken),
    });
    expect(yupTags.json<{ name: string }[]>().map((t) => t.name)).toEqual([
      "validation",
    ]);
  });

  it("corrida associando a mesma tag à mesma biblioteca retorna 409 via 23505 (PK library_id+tag_id)", async () => {
    const db = getTestDb();
    const app = buildServer({
      tagsRepository: {
        ...createTagsRepository(db),
        ...createLibrariesRepository(db),
        findLibraryTag: async () => undefined,
      },
    });
    const ana = await signUp(app, "ana@example.com", PASSWORD);
    const zod = (await createLibrary(app, ana.accessToken, "zod")).json<{
      id: string;
    }>();

    const first = await addTag(app, ana.accessToken, zod.id, "validation");
    const second = await addTag(app, ana.accessToken, zod.id, "validation");

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
  });
});

describe("bibliotecas só aceitam categoria global (Postgres real)", () => {
  async function setup() {
    const app = buildServer();
    const ana = await signUp(app, "ana@example.com", PASSWORD);
    const project = await createProject(app, ana.accessToken, "DevLib");
    const created = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/categories`,
      headers: bearer(ana.accessToken),
      payload: { name: "Infra interna" },
    });
    expect(created.statusCode).toBe(201);

    return {
      app,
      ana,
      project,
      projectCategory: created.json<{ id: string }>(),
    };
  }

  it("POST /libraries com categoria de projeto responde 404 e não grava nada", async () => {
    const { app, ana, projectCategory } = await setup();

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      headers: bearer(ana.accessToken),
      payload: { name: "drizzle-orm", categoryId: projectCategory.id },
    });

    expect(response.statusCode).toBe(404);
    expect(await getTestDb().select().from(libraries)).toHaveLength(0);
  });

  it("PATCH /libraries/:id com categoria de projeto de outro usuário responde 404 e não altera a biblioteca", async () => {
    const { app, projectCategory } = await setup();
    const bia = await signUp(app, "bia@example.com", PASSWORD);
    const library = (
      await createLibrary(app, bia.accessToken, "drizzle-orm")
    ).json<{ id: string }>();

    const response = await app.inject({
      method: "PATCH",
      url: `/libraries/${library.id}`,
      headers: bearer(bia.accessToken),
      payload: { categoryId: projectCategory.id },
    });
    const [row] = await getTestDb()
      .select()
      .from(libraries)
      .where(eq(libraries.id, library.id));

    expect(response.statusCode).toBe(404);
    expect(row.categoryId).toBeNull();
  });

  it("excluir um projeto com categorias responde 204 e remove as categorias dele", async () => {
    const { app, ana, project } = await setup();

    const response = await app.inject({
      method: "DELETE",
      url: `/projects/${project.id}`,
      headers: bearer(ana.accessToken),
    });

    expect(response.statusCode).toBe(204);
    expect(
      await getTestDb()
        .select()
        .from(categories)
        .where(eq(categories.projectId, project.id)),
    ).toHaveLength(0);
  });
});
