import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { UsersRepository } from "../repositories/users.repository";
import type { AuthConfig } from "../config/env";

const fakeAuthConfig: AuthConfig = {
  jwtSecret: "access-secret",
  jwtRefreshSecret: "refresh-secret",
  accessExpiresIn: "15m",
  refreshExpiresIn: "7d",
};

function authHeader(userId = "user-1") {
  const token = signAccessToken(
    { sub: userId, email: "ana@example.com" },
    fakeAuthConfig.jwtSecret,
    fakeAuthConfig.accessExpiresIn,
  );
  return `Bearer ${token}`;
}

function fakeUsersRepository(
  overrides: Partial<UsersRepository> = {},
): UsersRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    findUserById: vi.fn().mockResolvedValue(undefined),
    insertUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("GET /users/me", () => {
  it("retorna 200 com o perfil do usuário autenticado", async () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash: "hash",
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-09-13T00:00:00Z"),
      updatedAt: new Date("2026-09-13T00:00:00Z"),
    };
    const app = buildServer({
      usersRepository: fakeUsersRepository({
        findUserById: vi.fn().mockResolvedValue(user),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: authHeader("user-1") },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana",
      avatarUrl: null,
    });
    expect(response.json()).not.toHaveProperty("passwordHash");
  });

  it("retorna 404 quando o usuário do token não existe mais", async () => {
    const app = buildServer({
      usersRepository: fakeUsersRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: authHeader("id-inexistente") },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      usersRepository: fakeUsersRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
    });

    expect(response.statusCode).toBe(401);
  });
});
