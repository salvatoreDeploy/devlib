import { describe, expect, it } from "vitest";
import { categories } from "@devlib/db";
import { buildServer } from "../server";
import {
  getTestDb,
  insertGlobalCategory,
} from "../../test/integration/test-db";
import { bearer, createProject, signUp } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

type App = ReturnType<typeof buildServer>;
type Category = { id: string; projectId: string | null; name: string };

function createCategory(
  app: App,
  token: string,
  projectId: string,
  name: string,
) {
  return app.inject({
    method: "POST",
    url: `/projects/${projectId}/categories`,
    headers: bearer(token),
    payload: { name },
  });
}

function listProjectCategories(app: App, token: string, projectId: string) {
  return app.inject({
    method: "GET",
    url: `/projects/${projectId}/categories`,
    headers: bearer(token),
  });
}

function deleteCategory(
  app: App,
  token: string,
  projectId: string,
  categoryId: string,
) {
  return app.inject({
    method: "DELETE",
    url: `/projects/${projectId}/categories/${categoryId}`,
    headers: bearer(token),
  });
}

const names = (rows: Category[]) => rows.map((r) => r.name).sort();

async function setup() {
  const app = buildServer();
  const ana = await signUp(app, "ana@example.com", PASSWORD);
  const project = await createProject(app, ana.accessToken, "DevLib");

  return { app, ana, project };
}

describe("categorias de projeto (Postgres real)", () => {
  it("POST cria a categoria do projeto e GET /projects/:id/categories devolve globais + as do projeto", async () => {
    const { app, ana, project } = await setup();
    await insertGlobalCategory("Frontend");

    const created = await createCategory(
      app,
      ana.accessToken,
      project.id,
      "Infra interna",
    );
    const list = await listProjectCategories(app, ana.accessToken, project.id);

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      projectId: project.id,
      name: "Infra interna",
    });
    expect(list.statusCode).toBe(200);
    expect(names(list.json())).toEqual(["Frontend", "Infra interna"]);
  });

  it("GET /categories devolve só as globais, sem as categorias de projetos", async () => {
    const { app, ana, project } = await setup();
    await insertGlobalCategory("Frontend");
    await createCategory(app, ana.accessToken, project.id, "Infra interna");

    const response = await app.inject({
      method: "GET",
      url: "/categories",
      headers: bearer(ana.accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(names(response.json())).toEqual(["Frontend"]);
  });

  it("nome repetido no mesmo projeto retorna 409 e não grava a segunda linha", async () => {
    const { app, ana, project } = await setup();
    await createCategory(app, ana.accessToken, project.id, "Infra");

    const duplicate = await createCategory(
      app,
      ana.accessToken,
      project.id,
      "Infra",
    );

    expect(duplicate.statusCode).toBe(409);
    expect(await getTestDb().select().from(categories)).toHaveLength(1);
  });

  it("aceita o mesmo nome de uma global e o mesmo nome em outro projeto do usuário", async () => {
    const { app, ana, project } = await setup();
    const other = await createProject(app, ana.accessToken, "Outro");
    await insertGlobalCategory("Frontend");

    const sameAsGlobal = await createCategory(
      app,
      ana.accessToken,
      project.id,
      "Frontend",
    );
    await createCategory(app, ana.accessToken, project.id, "Infra");
    const sameInOtherProject = await createCategory(
      app,
      ana.accessToken,
      other.id,
      "Infra",
    );

    expect(sameAsGlobal.statusCode).toBe(201);
    expect(sameInOtherProject.statusCode).toBe(201);
    expect(
      names(
        (await listProjectCategories(app, ana.accessToken, other.id)).json(),
      ),
    ).toEqual(["Frontend", "Infra"]);
  });

  it("projeto de outro usuário retorna 404 em criar/listar/excluir, sem gravar nem excluir nada", async () => {
    const { app, ana, project } = await setup();
    const bia = await signUp(app, "bia@example.com", PASSWORD);
    const created = (
      await createCategory(app, ana.accessToken, project.id, "Infra")
    ).json<Category>();

    const create = await createCategory(
      app,
      bia.accessToken,
      project.id,
      "Invasora",
    );
    const list = await listProjectCategories(app, bia.accessToken, project.id);
    const del = await deleteCategory(
      app,
      bia.accessToken,
      project.id,
      created.id,
    );

    expect([create.statusCode, list.statusCode, del.statusCode]).toEqual([
      404, 404, 404,
    ]);
    expect(names(await getTestDb().select().from(categories))).toEqual([
      "Infra",
    ]);
  });

  it("DELETE remove a categoria do projeto e ela some da listagem", async () => {
    const { app, ana, project } = await setup();
    const created = (
      await createCategory(app, ana.accessToken, project.id, "Infra")
    ).json<Category>();

    const del = await deleteCategory(
      app,
      ana.accessToken,
      project.id,
      created.id,
    );

    expect(del.statusCode).toBe(204);
    expect(
      (await listProjectCategories(app, ana.accessToken, project.id)).json(),
    ).toEqual([]);
  });

  it("DELETE de uma global via projeto retorna 404 e mantém a global no banco", async () => {
    const { app, ana, project } = await setup();
    const global = await insertGlobalCategory("Frontend");

    const del = await deleteCategory(
      app,
      ana.accessToken,
      project.id,
      global.id,
    );

    expect(del.statusCode).toBe(404);
    expect(await getTestDb().select().from(categories)).toHaveLength(1);
  });

  it("DELETE de categoria de outro projeto do mesmo usuário retorna 404 e não exclui", async () => {
    const { app, ana, project } = await setup();
    const other = await createProject(app, ana.accessToken, "Outro");
    const created = (
      await createCategory(app, ana.accessToken, other.id, "Infra")
    ).json<Category>();

    const del = await deleteCategory(
      app,
      ana.accessToken,
      project.id,
      created.id,
    );

    expect(del.statusCode).toBe(404);
    expect(await getTestDb().select().from(categories)).toHaveLength(1);
  });
});
