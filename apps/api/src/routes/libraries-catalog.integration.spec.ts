import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { libraries, tags } from "@devlib/db";
import { buildServer } from "../server";
import {
  getTestDb,
  insertGlobalCategory,
  insertLibrary,
} from "../../test/integration/test-db";
import { bearer, createProject, signUp } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

type App = ReturnType<typeof buildServer>;

type CatalogItem = {
  id: string;
  name: string;
  projectsCount: number;
  effectiveCategories: {
    id: string | null;
    name: string | null;
    projects: { id: string; name: string }[];
  }[];
};

type CatalogResponse = {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

async function catalog(app: App, token: string, query = "") {
  const response = await app.inject({
    method: "GET",
    url: `/libraries/catalog${query}`,
    headers: bearer(token),
  });
  expect(response.statusCode).toBe(200);
  return response.json<CatalogResponse>();
}

function names(body: CatalogResponse) {
  return body.items.map((item) => item.name);
}

async function associate(
  app: App,
  token: string,
  projectId: string,
  libraryId: string,
  categoryId?: string,
) {
  const response = await app.inject({
    method: "POST",
    url: `/projects/${projectId}/libraries`,
    headers: bearer(token),
    payload: { libraryId, ...(categoryId && { categoryId }) },
  });
  expect(response.statusCode).toBe(201);
}

async function createProjectCategory(
  app: App,
  token: string,
  projectId: string,
  name: string,
) {
  const response = await app.inject({
    method: "POST",
    url: `/projects/${projectId}/categories`,
    headers: bearer(token),
    payload: { name },
  });
  expect(response.statusCode).toBe(201);
  return response.json<{ id: string }>();
}

async function addTag(
  app: App,
  token: string,
  libraryId: string,
  name: string,
) {
  const response = await app.inject({
    method: "POST",
    url: `/libraries/${libraryId}/tags`,
    headers: bearer(token),
    payload: { name },
  });
  expect(response.statusCode).toBe(201);
  return response.json<{ id: string }>();
}

async function setGlobalCategory(libraryId: string, categoryId: string) {
  await getTestDb()
    .update(libraries)
    .set({ categoryId })
    .where(eq(libraries.id, libraryId));
}

// Ana: Alfa (react c/ categoria do projeto "Estado", zod) e Beta (react sem
// categoria do projeto → global Frontend, drizzle-orm). Bruno: Gama (moment c/
// categoria do projeto "Secreta", lodash). Globais: react/lodash = Frontend,
// drizzle-orm = ORM; zod e moment sem categoria. Tag "ui" em react e lodash.
async function setup() {
  const app = buildServer();
  const ana = await signUp(app, "ana@example.com", PASSWORD);
  const bruno = await signUp(app, "bruno@example.com", PASSWORD);
  const alfa = await createProject(app, ana.accessToken, "Alfa");
  const beta = await createProject(app, ana.accessToken, "Beta");
  const gama = await createProject(app, bruno.accessToken, "Gama");

  const frontend = await insertGlobalCategory("Frontend");
  const orm = await insertGlobalCategory("ORM");
  const estado = await createProjectCategory(
    app,
    ana.accessToken,
    alfa.id,
    "Estado",
  );
  const secreta = await createProjectCategory(
    app,
    bruno.accessToken,
    gama.id,
    "Secreta",
  );

  const react = await insertLibrary("react");
  const zod = await insertLibrary("zod");
  const drizzle = await insertLibrary("drizzle-orm");
  const moment = await insertLibrary("moment");
  const lodash = await insertLibrary("lodash");
  await setGlobalCategory(react.id, frontend.id);
  await setGlobalCategory(lodash.id, frontend.id);
  await setGlobalCategory(drizzle.id, orm.id);

  await associate(app, ana.accessToken, alfa.id, react.id, estado.id);
  await associate(app, ana.accessToken, alfa.id, zod.id);
  await associate(app, ana.accessToken, beta.id, react.id);
  await associate(app, ana.accessToken, beta.id, drizzle.id);
  await associate(app, bruno.accessToken, gama.id, moment.id, secreta.id);
  await associate(app, bruno.accessToken, gama.id, lodash.id);

  const ui = await addTag(app, ana.accessToken, react.id, "ui");
  await addTag(app, ana.accessToken, lodash.id, "ui");

  return {
    app,
    ana,
    bruno,
    alfa,
    beta,
    ids: { frontend, orm, estado, secreta, ui },
  };
}

describe("GET /libraries/catalog (Postgres real)", () => {
  it("lista o catálogo inteiro por nome, com projectsCount e categorias efetivas só dos projetos do usuário", async () => {
    const { app, ana, alfa, beta, ids } = await setup();

    const body = await catalog(app, ana.accessToken);

    expect(body).toMatchObject({ total: 5, page: 1, pageSize: 10 });
    expect(names(body)).toEqual([
      "drizzle-orm",
      "lodash",
      "moment",
      "react",
      "zod",
    ]);
    const byName = Object.fromEntries(
      body.items.map((item) => [item.name, item]),
    );
    expect(byName.react.projectsCount).toBe(2);
    // projeto de outro usuário não conta
    expect(byName.lodash.projectsCount).toBe(0);
    expect(byName.lodash.effectiveCategories).toEqual([]);
    // categoria do projeto vence a global (Alfa → Estado; Beta → Frontend)
    expect(byName.react.effectiveCategories).toEqual([
      {
        id: ids.estado.id,
        name: "Estado",
        projects: [{ id: alfa.id, name: "Alfa" }],
      },
      {
        id: ids.frontend.id,
        name: "Frontend",
        projects: [{ id: beta.id, name: "Beta" }],
      },
    ]);
    expect(byName.zod.effectiveCategories).toEqual([
      { id: null, name: null, projects: [{ id: alfa.id, name: "Alfa" }] },
    ]);
  });

  it("usage=used / unused separa pelo uso nos projetos do usuário", async () => {
    const { app, ana, bruno } = await setup();

    expect(names(await catalog(app, ana.accessToken, "?usage=used"))).toEqual([
      "drizzle-orm",
      "react",
      "zod",
    ]);
    expect(names(await catalog(app, ana.accessToken, "?usage=unused"))).toEqual(
      ["lodash", "moment"],
    );
    expect(names(await catalog(app, bruno.accessToken, "?usage=used"))).toEqual(
      ["lodash", "moment"],
    );
  });

  it("q busca trecho do nome sem diferenciar maiúsculas; curingas do LIKE são texto literal", async () => {
    const { app, ana } = await setup();

    expect(names(await catalog(app, ana.accessToken, "?q=RE"))).toEqual([
      "react",
    ]);
    expect(names(await catalog(app, ana.accessToken, "?q=O"))).toEqual([
      "drizzle-orm",
      "lodash",
      "moment",
      "zod",
    ]);
    expect((await catalog(app, ana.accessToken, "?q=%25")).total).toBe(0);
    expect((await catalog(app, ana.accessToken, "?q=_")).total).toBe(0);
  });

  it("categoryId casa com o que a coluna mostra: efetiva quando usada, global quando não usada", async () => {
    const { app, ana, ids } = await setup();

    // react: efetiva Frontend em Beta; lodash: não usada pela Ana, global Frontend
    expect(
      names(
        await catalog(app, ana.accessToken, `?categoryId=${ids.frontend.id}`),
      ),
    ).toEqual(["lodash", "react"]);
    expect(
      names(
        await catalog(app, ana.accessToken, `?categoryId=${ids.estado.id}`),
      ),
    ).toEqual(["react"]);
    expect(
      names(await catalog(app, ana.accessToken, `?categoryId=${ids.orm.id}`)),
    ).toEqual(["drizzle-orm"]);
    // zod: usada sem categoria efetiva; moment: não usada pela Ana, sem global
    expect(
      names(await catalog(app, ana.accessToken, "?categoryId=none")),
    ).toEqual(["moment", "zod"]);
  });

  it("categoria de projeto de outro usuário não vaza: filtrar por ela não acha nada", async () => {
    const { app, ana, ids } = await setup();

    const body = await catalog(
      app,
      ana.accessToken,
      `?categoryId=${ids.secreta.id}`,
    );

    expect(body).toMatchObject({ items: [], total: 0, page: 1 });
  });

  it("tagId filtra pelas bibliotecas com a tag; filtros combinam", async () => {
    const { app, ana, ids } = await setup();

    expect(
      names(await catalog(app, ana.accessToken, `?tagId=${ids.ui.id}`)),
    ).toEqual(["lodash", "react"]);
    expect(
      names(
        await catalog(app, ana.accessToken, `?tagId=${ids.ui.id}&usage=used`),
      ),
    ).toEqual(["react"]);
  });

  it("pagina de 10 em 10 com total; página além da última devolve a última", async () => {
    const { app, ana } = await setup();
    for (let i = 1; i <= 8; i += 1) {
      await insertLibrary(`pkg-${String(i).padStart(2, "0")}`);
    }

    const page1 = await catalog(app, ana.accessToken);
    const page2 = await catalog(app, ana.accessToken, "?page=2");
    const beyond = await catalog(app, ana.accessToken, "?page=99");

    expect(page1.total).toBe(13);
    expect(page1.items).toHaveLength(10);
    expect(page2).toMatchObject({ page: 2, total: 13 });
    expect(names(page2)).toEqual(["pkg-08", "react", "zod"]);
    expect(beyond.page).toBe(2);
    expect(names(beyond)).toEqual(names(page2));
  });
});

type FacetsResponse = {
  categories: {
    id: string;
    name: string;
    projectId: string | null;
    projectName: string | null;
  }[];
  hasUncategorized: boolean;
  tags: { id: string; name: string }[];
};

async function facets(app: App, token: string) {
  const response = await app.inject({
    method: "GET",
    url: "/libraries/catalog/facets",
    headers: bearer(token),
  });
  expect(response.statusCode).toBe(200);
  return response.json<FacetsResponse>();
}

describe("GET /libraries/catalog/facets (Postgres real)", () => {
  it("oferece só as categorias que a coluna da Home mostra pro usuário (efetiva se usa, global se não), sem vazar as de outro usuário", async () => {
    const { app, ana, bruno, alfa, ids } = await setup();
    // global sem nenhuma biblioteca: nunca aparece
    await insertGlobalCategory("Vazia");

    const anaFacets = await facets(app, ana.accessToken);
    const brunoFacets = await facets(app, bruno.accessToken);

    // Ana: react (Estado em Alfa, Frontend em Beta), drizzle (ORM), lodash
    // não usada (global Frontend); "Secreta" é do projeto do Bruno
    expect(anaFacets.categories).toEqual([
      {
        id: ids.frontend.id,
        name: "Frontend",
        projectId: null,
        projectName: null,
      },
      { id: ids.orm.id, name: "ORM", projectId: null, projectName: null },
      {
        id: ids.estado.id,
        name: "Estado",
        projectId: alfa.id,
        projectName: "Alfa",
      },
    ]);
    expect(brunoFacets.categories.map((category) => category.name)).toEqual([
      "Frontend",
      "ORM",
      "Secreta",
    ]);
  });

  it("hasUncategorized indica se 'Sem categoria' tem resultado", async () => {
    const { app, ana } = await setup();

    // zod (usada sem categoria efetiva) e moment (não usada, sem global)
    expect((await facets(app, ana.accessToken)).hasUncategorized).toBe(true);
  });

  it("hasUncategorized é false quando toda biblioteca mostra alguma categoria", async () => {
    const app = buildServer();
    const ana = await signUp(app, "ana@example.com", PASSWORD);
    const frontend = await insertGlobalCategory("Frontend");
    const react = await insertLibrary("react");
    await setGlobalCategory(react.id, frontend.id);

    expect((await facets(app, ana.accessToken)).hasUncategorized).toBe(false);
  });

  it("lista só as tags com ao menos uma biblioteca, por nome", async () => {
    const { app, ana } = await setup();
    await getTestDb().insert(tags).values({ name: "orfa" });

    expect(
      (await facets(app, ana.accessToken)).tags.map((tag) => tag.name),
    ).toEqual(["ui"]);
  });
});

describe("GET /libraries/overview (removida — substituída por /libraries/catalog)", () => {
  it("não existe mais: cai em GET /libraries/:id e responde 404", async () => {
    const app = buildServer();
    const ana = await signUp(app, "ana@example.com", PASSWORD);
    await insertLibrary("react");

    const response = await app.inject({
      method: "GET",
      url: "/libraries/overview",
      headers: bearer(ana.accessToken),
    });

    expect(response.statusCode).toBe(404);
  });
});
