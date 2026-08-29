import { describe, expect, it, vi } from "vitest";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { buildServer } from "../server";
import type { LoginRepository } from "../services/auth.service";
import type { AuthConfig } from "../config/env";

const fakeAuthConfig: AuthConfig = {
  jwtSecret: "access-secret",
  jwtRefreshSecret: "refresh-secret",
  accessExpiresIn: "15m",
  refreshExpiresIn: "7d",
};

function fakeLoginRepository(
  overrides: Partial<LoginRepository> = {},
): LoginRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    insertRefreshToken: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("POST /auth/login", () => {
  it("retorna 200 com accessToken e refreshToken válidos quando as credenciais estão corretas", async () => {
    const passwordHash = await argon2.hash("senha1234");
    const app = buildServer({
      loginRepository: fakeLoginRepository({
        findUserByEmail: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "ana@example.com",
          passwordHash,
        }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@example.com", password: "senha1234" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(
      jwt.verify(body.accessToken, fakeAuthConfig.jwtSecret),
    ).toMatchObject({
      sub: "user-1",
      email: "ana@example.com",
    });
    expect(
      jwt.verify(body.refreshToken, fakeAuthConfig.jwtRefreshSecret),
    ).toMatchObject({ sub: "user-1" });
  });

  it("retorna 401 quando o email não existe", async () => {
    const app = buildServer({
      loginRepository: fakeLoginRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ninguem@example.com", password: "senha1234" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 401 quando a senha está errada", async () => {
    const passwordHash = await argon2.hash("senha-correta");
    const app = buildServer({
      loginRepository: fakeLoginRepository({
        findUserByEmail: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "ana@example.com",
          passwordHash,
        }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@example.com", password: "senha-errada" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando o email é inválido", async () => {
    const app = buildServer({
      loginRepository: fakeLoginRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nao-e-email", password: "senha1234" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando a senha está vazia", async () => {
    const app = buildServer({
      loginRepository: fakeLoginRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@example.com", password: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });
});
