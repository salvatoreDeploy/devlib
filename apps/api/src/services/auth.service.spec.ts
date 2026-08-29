import { describe, it, expect, vi } from "vitest";
import * as argon2 from "argon2";
import {
  registerUser,
  EmailAlreadyInUseError,
  type AuthRepository,
} from "./auth.service";

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

describe("registerUser", () => {
  it("lança EmailAlreadyInUseError quando o email já está cadastrado", async () => {
    const repository = fakeRepository({
      findUserByEmail: vi.fn().mockResolvedValue({ id: "existing-id" }),
    });

    await expect(
      registerUser(repository, {
        email: "ana@example.com",
        password: "senha1234",
      }),
    ).rejects.toThrow(EmailAlreadyInUseError);
    expect(repository.insertUser).not.toHaveBeenCalled();
  });

  it("faz hash da senha com argon2 antes de persistir, nunca texto puro", async () => {
    const repository = fakeRepository();

    await registerUser(repository, {
      email: "ana@example.com",
      password: "senha1234",
    });

    const insertedData = vi.mocked(repository.insertUser).mock.calls[0][0];
    expect(insertedData.passwordHash).not.toBe("senha1234");
    await expect(
      argon2.verify(insertedData.passwordHash, "senha1234"),
    ).resolves.toBe(true);
  });

  it("retorna o usuário criado sem o passwordHash", async () => {
    const repository = fakeRepository();

    const result = await registerUser(repository, {
      email: "ana@example.com",
      password: "senha1234",
    });

    expect(result).toEqual({
      id: "new-user-id",
      email: "ana@example.com",
      createdAt: new Date("2026-08-29T00:00:00Z"),
    });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
