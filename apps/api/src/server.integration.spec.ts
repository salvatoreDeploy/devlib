import { describe, expect, it } from "vitest";
import { buildServer } from "./server";
import { bearer, createProject, signUp } from "../test/integration/http";

const PASSWORD = "senha-forte-123";
const NOT_A_UUID = "nao-e-uuid";

async function setup() {
  const app = buildServer();
  const ana = await signUp(app, "ana@example.com", PASSWORD);

  return { app, ana };
}

describe("id que não é UUID (Postgres real, 22P02)", () => {
  it("GET /projects/:id responde 404 em vez de 500", async () => {
    const { app, ana } = await setup();

    const response = await app.inject({
      method: "GET",
      url: `/projects/${NOT_A_UUID}`,
      headers: bearer(ana.accessToken),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Recurso não encontrado" });
  });

  it("GET /projects/:id/categories responde 404 sem expor o SQL", async () => {
    const { app, ana } = await setup();

    const response = await app.inject({
      method: "GET",
      url: `/projects/${NOT_A_UUID}/categories`,
      headers: bearer(ana.accessToken),
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("Failed query");
  });

  it("DELETE /projects/:id/categories/:categoryId com categoryId inválido responde 404", async () => {
    const { app, ana } = await setup();
    const project = await createProject(app, ana.accessToken, "DevLib");

    const response = await app.inject({
      method: "DELETE",
      url: `/projects/${project.id}/categories/${NOT_A_UUID}`,
      headers: bearer(ana.accessToken),
    });

    expect(response.statusCode).toBe(404);
  });

  it("POST /libraries com categoryId inválido no corpo responde 404 (mesmo status de categoria inexistente)", async () => {
    const { app, ana } = await setup();

    const response = await app.inject({
      method: "POST",
      url: "/libraries",
      headers: bearer(ana.accessToken),
      payload: { name: "zod", categoryId: NOT_A_UUID },
    });

    expect(response.statusCode).toBe(404);
  });
});
