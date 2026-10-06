import { describe, expect, it } from "vitest";
import { users } from "@devlib/db";
import { eq } from "drizzle-orm";
import { buildServer } from "../server";
import { getTestDb } from "../../test/integration/test-db";
import { bearer, signUp, login } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

describe("GET/PATCH /users/me (Postgres real)", () => {
  it("GET retorna o perfil persistido no cadastro, sem passwordHash", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: bearer(session.accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      id: session.userId,
      email: "ana@example.com",
      name: null,
      avatarUrl: null,
    });
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("PATCH do nome persiste no banco e aparece no GET seguinte", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const patch = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: bearer(session.accessToken),
      payload: { name: "Ana Souza" },
    });
    const get = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: bearer(session.accessToken),
    });

    expect(patch.statusCode).toBe(200);
    expect(get.json()).toMatchObject({ name: "Ana Souza" });
    const [row] = await getTestDb()
      .select()
      .from(users)
      .where(eq(users.id, session.userId));
    expect(row.name).toBe("Ana Souza");
  });

  it("PATCH do e-mail com currentPassword correta: login passa a valer só com o e-mail novo", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const patch = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: bearer(session.accessToken),
      payload: { email: "ana.nova@example.com", currentPassword: PASSWORD },
    });

    expect(patch.statusCode).toBe(200);
    expect(
      (await login(app, "ana.nova@example.com", PASSWORD)).statusCode,
    ).toBe(200);
    expect((await login(app, "ana@example.com", PASSWORD)).statusCode).toBe(
      401,
    );
  });

  it("PATCH do e-mail com currentPassword errada retorna 401 e não altera o banco", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const patch = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: bearer(session.accessToken),
      payload: { email: "ana.nova@example.com", currentPassword: "errada-123" },
    });

    expect(patch.statusCode).toBe(401);
    const [row] = await getTestDb()
      .select()
      .from(users)
      .where(eq(users.id, session.userId));
    expect(row.email).toBe("ana@example.com");
  });

  it("PATCH pro e-mail de outro usuário retorna 409", async () => {
    const app = buildServer();
    await signUp(app, "bia@example.com", PASSWORD);
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const patch = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: bearer(session.accessToken),
      payload: { email: "bia@example.com", currentPassword: PASSWORD },
    });

    expect(patch.statusCode).toBe(409);
  });

  it("PATCH da senha grava hash argon2, revoga as sessões abertas e troca a senha válida no login", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const patch = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: bearer(session.accessToken),
      payload: { password: "senha-nova-456", currentPassword: PASSWORD },
    });

    expect(patch.statusCode).toBe(200);
    const [row] = await getTestDb()
      .select()
      .from(users)
      .where(eq(users.id, session.userId));
    expect(row.passwordHash).toMatch(/^\$argon2/);
    expect(row.passwordHash).not.toContain("senha-nova-456");

    const refresh = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: session.refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
    expect((await login(app, "ana@example.com", PASSWORD)).statusCode).toBe(
      401,
    );
    expect(
      (await login(app, "ana@example.com", "senha-nova-456")).statusCode,
    ).toBe(200);
  });

  it("retorna 404 quando o usuário do token foi excluído do banco", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);
    await getTestDb().delete(users).where(eq(users.id, session.userId));

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: bearer(session.accessToken),
    });

    expect(response.statusCode).toBe(404);
  });
});
