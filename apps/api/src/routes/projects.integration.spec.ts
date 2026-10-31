import { describe, expect, it } from "vitest";
import { projects } from "@devlib/db";
import { buildServer } from "../server";
import { createProjectsRepository } from "../repositories/projects.repository";
import { getTestDb } from "../../test/integration/test-db";
import { bearer, signUp } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

type App = ReturnType<typeof buildServer>;

function postProject(app: App, token: string, name: string) {
  return app.inject({
    method: "POST",
    url: "/projects",
    headers: bearer(token),
    payload: { name },
  });
}

// a checagem prévia do service nunca encontra o outro projeto, então o
// insert/update bate no unique(user_id, name) real do banco
function appWithoutNameCheck() {
  return buildServer({
    projectsRepository: {
      ...createProjectsRepository(getTestDb()),
      findProjectByUserIdAndName: async () => undefined,
    },
  });
}

describe("projetos — unique(user_id, name) (Postgres real)", () => {
  it("corrida criando dois projetos com o mesmo nome retorna 409 via 23505 e grava uma linha só", async () => {
    const app = appWithoutNameCheck();
    const ana = await signUp(app, "ana@example.com", PASSWORD);

    const first = await postProject(app, ana.accessToken, "DevLib");
    const second = await postProject(app, ana.accessToken, "DevLib");

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(await getTestDb().select().from(projects)).toHaveLength(1);
  });

  it("corrida renomeando um projeto pro nome de outro do mesmo usuário retorna 409 via 23505", async () => {
    const app = appWithoutNameCheck();
    const ana = await signUp(app, "ana@example.com", PASSWORD);
    await postProject(app, ana.accessToken, "DevLib");
    const other = (await postProject(app, ana.accessToken, "Outro")).json<{
      id: string;
    }>();

    const rename = await app.inject({
      method: "PATCH",
      url: `/projects/${other.id}`,
      headers: bearer(ana.accessToken),
      payload: { name: "DevLib" },
    });

    expect(rename.statusCode).toBe(409);
  });

  it("usuários diferentes podem ter projetos com o mesmo nome (unique é por usuário)", async () => {
    const app = appWithoutNameCheck();
    const ana = await signUp(app, "ana@example.com", PASSWORD);
    const bia = await signUp(app, "bia@example.com", PASSWORD);

    const anaProject = await postProject(app, ana.accessToken, "DevLib");
    const biaProject = await postProject(app, bia.accessToken, "DevLib");

    expect(anaProject.statusCode).toBe(201);
    expect(biaProject.statusCode).toBe(201);
  });
});
