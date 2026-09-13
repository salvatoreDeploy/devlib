import { describe, it, expect, vi } from "vitest";
import { getCurrentUser, UserNotFoundError } from "./users.service";
import type { UsersRepository } from "../repositories/users.repository";

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

describe("getCurrentUser", () => {
  it("retorna o usuário quando o id existe", async () => {
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash: "hash",
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
    };
    const repository = fakeUsersRepository({
      findUserById: vi.fn().mockResolvedValue(user),
    });

    const result = await getCurrentUser(repository, "user-1");

    expect(result).toEqual(user);
  });

  it("lança UserNotFoundError quando o id não existe", async () => {
    const repository = fakeUsersRepository();

    await expect(getCurrentUser(repository, "id-inexistente")).rejects.toThrow(
      UserNotFoundError,
    );
  });
});
