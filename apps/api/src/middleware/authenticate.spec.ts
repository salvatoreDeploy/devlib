import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { createAuthenticateMiddleware } from "./authenticate";
import { signAccessToken } from "../services/token.service";
import type { AuthConfig } from "../config/env";

const fakeAuthConfig: AuthConfig = {
  jwtSecret: "access-secret",
  jwtRefreshSecret: "refresh-secret",
  accessExpiresIn: "15m",
  refreshExpiresIn: "7d",
};

function buildTestApp() {
  const app = Fastify();
  const authenticate = createAuthenticateMiddleware(fakeAuthConfig);

  app.get("/protected", { preHandler: authenticate }, async (request) => {
    return { user: request.user };
  });

  return app;
}

describe("authenticate", () => {
  it("retorna 401 quando não há header Authorization", async () => {
    const app = buildTestApp();

    const response = await app.inject({ method: "GET", url: "/protected" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 401 quando o header não é 'Bearer <token>'", async () => {
    const app = buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Token abc123" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 401 quando o token é inválido", async () => {
    const app = buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer token-invalido" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty("error");
  });

  it("popula request.user e segue quando o token é válido", async () => {
    const app = buildTestApp();
    const token = signAccessToken(
      { sub: "user-1", email: "ana@example.com" },
      fakeAuthConfig.jwtSecret,
      "15m",
    );

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: { id: "user-1", email: "ana@example.com" },
    });
  });
});
