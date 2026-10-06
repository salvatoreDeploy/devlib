import { describe, expect, it } from "vitest";
import { refreshTokens } from "@devlib/db";
import { eq } from "drizzle-orm";
import { buildServer } from "../server";
import { getTestDb } from "../../test/integration/test-db";
import { login, signUp } from "../../test/integration/http";

const PASSWORD = "senha-forte-123";

function logout(app: ReturnType<typeof buildServer>, refreshToken: string) {
  return app.inject({
    method: "POST",
    url: "/auth/logout",
    payload: { refreshToken },
  });
}

function refresh(app: ReturnType<typeof buildServer>, refreshToken: string) {
  return app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: { refreshToken },
  });
}

describe("POST /auth/logout (Postgres real)", () => {
  it("revoga o refresh token no banco: o mesmo token não renova mais a sessão", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const response = await logout(app, session.refreshToken);

    expect(response.statusCode).toBe(204);
    const rows = await getTestDb()
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, session.userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
    expect((await refresh(app, session.refreshToken)).statusCode).toBe(401);
  });

  it("encerra só a sessão do token informado — outra sessão do mesmo usuário continua renovando", async () => {
    const app = buildServer();
    const first = await signUp(app, "ana@example.com", PASSWORD);
    const second = (await login(app, "ana@example.com", PASSWORD)).json<{
      refreshToken: string;
    }>();

    await logout(app, first.refreshToken);

    expect((await refresh(app, second.refreshToken)).statusCode).toBe(200);
  });

  it("é idempotente: repetir o logout com o mesmo token continua retornando 204", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    await logout(app, session.refreshToken);
    const again = await logout(app, session.refreshToken);

    expect(again.statusCode).toBe(204);
  });

  it("token desconhecido retorna 204 sem revogar nenhuma sessão existente", async () => {
    const app = buildServer();
    const session = await signUp(app, "ana@example.com", PASSWORD);

    const response = await logout(app, "token-que-nunca-existiu");

    expect(response.statusCode).toBe(204);
    expect((await refresh(app, session.refreshToken)).statusCode).toBe(200);
  });
});
