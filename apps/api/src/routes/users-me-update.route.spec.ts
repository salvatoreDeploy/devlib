import { describe, expect, it, vi } from "vitest";
import * as argon2 from "argon2";
import { buildServer } from "../server";
import { signAccessToken } from "../services/token.service";
import type { UpdateUserRepository } from "../services/users.service";
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

function fakeUsersUpdateRepository(
  overrides: Partial<UpdateUserRepository> = {},
): UpdateUserRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    findUserById: vi.fn().mockResolvedValue(undefined),
    insertUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    revokeAllRefreshTokensByUserId: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("PATCH /users/me", () => {
  it("retorna 200 e atualiza o nome sem exigir currentPassword", async () => {
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
      usersUpdateRepository: fakeUsersUpdateRepository({
        findUserById: vi.fn().mockResolvedValue(user),
        updateUser: vi.fn().mockResolvedValue({ ...user, name: "Ana Nova" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: authHeader() },
      payload: { name: "Ana Nova" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: "Ana Nova" });
    expect(response.json()).not.toHaveProperty("passwordHash");
  });

  it("retorna 400 quando email vem sem currentPassword", async () => {
    const app = buildServer({
      usersUpdateRepository: fakeUsersUpdateRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: authHeader() },
      payload: { email: "ana-nova@example.com" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 400 quando password vem sem currentPassword", async () => {
    const app = buildServer({
      usersUpdateRepository: fakeUsersUpdateRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: authHeader() },
      payload: { password: "senha-nova-123" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("retorna 401 quando currentPassword está incorreta", async () => {
    const passwordHash = await argon2.hash("senha-correta");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-09-13T00:00:00Z"),
      updatedAt: new Date("2026-09-13T00:00:00Z"),
    };
    const app = buildServer({
      usersUpdateRepository: fakeUsersUpdateRepository({
        findUserById: vi.fn().mockResolvedValue(user),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: authHeader() },
      payload: {
        email: "ana-nova@example.com",
        currentPassword: "senha-errada",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("retorna 409 quando o novo email já é de outro usuário", async () => {
    const passwordHash = await argon2.hash("senha1234");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-09-13T00:00:00Z"),
      updatedAt: new Date("2026-09-13T00:00:00Z"),
    };
    const app = buildServer({
      usersUpdateRepository: fakeUsersUpdateRepository({
        findUserById: vi.fn().mockResolvedValue(user),
        findUserByEmail: vi.fn().mockResolvedValue({ id: "outro-user" }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: authHeader() },
      payload: { email: "bia@example.com", currentPassword: "senha1234" },
    });

    expect(response.statusCode).toBe(409);
  });

  it("retorna 200, troca a senha e revoga os refresh tokens quando currentPassword está correta", async () => {
    const passwordHash = await argon2.hash("senha-atual");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-09-13T00:00:00Z"),
      updatedAt: new Date("2026-09-13T00:00:00Z"),
    };
    const repository = fakeUsersUpdateRepository({
      findUserById: vi.fn().mockResolvedValue(user),
      updateUser: vi.fn().mockResolvedValue(user),
    });
    const app = buildServer({
      usersUpdateRepository: repository,
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: authHeader() },
      payload: {
        password: "senha-nova-123",
        currentPassword: "senha-atual",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(repository.revokeAllRefreshTokensByUserId).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("retorna 404 quando o usuário do token não existe mais", async () => {
    const app = buildServer({
      usersUpdateRepository: fakeUsersUpdateRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      headers: { authorization: authHeader("id-inexistente") },
      payload: { name: "Ana Nova" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("retorna 401 quando não há token de acesso", async () => {
    const app = buildServer({
      usersUpdateRepository: fakeUsersUpdateRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/users/me",
      payload: { name: "Ana Nova" },
    });

    expect(response.statusCode).toBe(401);
  });
});
