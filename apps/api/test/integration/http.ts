import { expect } from "vitest";
import type { buildServer } from "../../src/server";

type App = ReturnType<typeof buildServer>;

export function bearer(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

export function login(app: App, email: string, password: string) {
  return app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
}

// cadastro + login pelas rotas reais — o usuário nasce com hash argon2 e o
// refresh token fica gravado em refresh_tokens, como no fluxo do apps/web
export async function signUp(app: App, email: string, password: string) {
  const register = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password },
  });
  expect(register.statusCode).toBe(201);

  const session = await login(app, email, password);
  expect(session.statusCode).toBe(200);

  const tokens = session.json<{ accessToken: string; refreshToken: string }>();

  return { userId: register.json<{ id: string }>().id, ...tokens };
}

export async function createProject(
  app: App,
  accessToken: string,
  name: string,
) {
  const response = await app.inject({
    method: "POST",
    url: "/projects",
    headers: bearer(accessToken),
    payload: { name },
  });
  expect(response.statusCode).toBe(201);

  return response.json<{ id: string; name: string }>();
}
