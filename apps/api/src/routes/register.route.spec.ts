import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import type { AuthRepository } from "../services/auth.service";

function fakeRepository(
  overrides: Partial<AuthRepository> = {},
): AuthRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    insertUser: vi.fn().mockImplementation(async (data) => ({
      id: "new-user-id",
      email: data.email,
      createdAt: new Date("2026-08-29T00:00:00Z"),
    })),
    ...overrides,
  };
}

describe("POST /auth/register", () => {
  it("retorna 201 com o usuário criado, sem passwordHash", async () => {
    const app = buildServer({ usersRepository: fakeRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "senha1234" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: "new-user-id",
      email: "ana@example.com",
      createdAt: "2026-08-29T00:00:00.000Z",
    });
  });

  it("retorna 400 quando o email é inválido", async () => {
    const app = buildServer({ usersRepository: fakeRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "nao-e-email", password: "senha1234" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando a senha tem menos de 8 caracteres", async () => {
    const app = buildServer({ usersRepository: fakeRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "curta" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 409 quando o email já está em uso", async () => {
    const app = buildServer({
      usersRepository: fakeRepository({
        findUserByEmail: vi.fn().mockResolvedValue({ id: "existing-id" }),
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "ana@example.com", password: "senha1234" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toHaveProperty("error");
  });
});
