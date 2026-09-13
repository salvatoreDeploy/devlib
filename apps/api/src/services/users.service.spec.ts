import { describe, it, expect, vi } from "vitest";
import * as argon2 from "argon2";
import {
  getCurrentUser,
  updateCurrentUser,
  UserNotFoundError,
  InvalidCurrentPasswordError,
  type UpdateUserRepository,
} from "./users.service";
import { EmailAlreadyInUseError } from "./auth.service";
import type { UsersRepository } from "../repositories/users.repository";

function fakeUsersRepository(
  overrides: Partial<UsersRepository> = {},
): UsersRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(undefined),
    findUserById: vi.fn().mockResolvedValue(undefined),
    insertUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
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

function fakeUpdateUserRepository(
  overrides: Partial<UpdateUserRepository> = {},
): UpdateUserRepository {
  return {
    ...fakeUsersRepository(),
    revokeAllRefreshTokensByUserId: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("updateCurrentUser", () => {
  it("lança UserNotFoundError quando o id não existe", async () => {
    const repository = fakeUpdateUserRepository();

    await expect(
      updateCurrentUser(repository, { userId: "id-inexistente", data: {} }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it("atualiza o nome sem exigir currentPassword", async () => {
    const passwordHash = await argon2.hash("senha1234");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
    };
    const updated = { ...user, name: "Ana Nova" };
    const repository = fakeUpdateUserRepository({
      findUserById: vi.fn().mockResolvedValue(user),
      updateUser: vi.fn().mockResolvedValue(updated),
    });

    const result = await updateCurrentUser(repository, {
      userId: "user-1",
      data: { name: "Ana Nova" },
    });

    expect(result).toEqual(updated);
    expect(repository.updateUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ name: "Ana Nova" }),
    );
  });

  it("lança InvalidCurrentPasswordError quando currentPassword não bate, ao trocar email", async () => {
    const passwordHash = await argon2.hash("senha-correta");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
    };
    const repository = fakeUpdateUserRepository({
      findUserById: vi.fn().mockResolvedValue(user),
    });

    await expect(
      updateCurrentUser(repository, {
        userId: "user-1",
        data: {
          email: "ana-nova@example.com",
          currentPassword: "senha-errada",
        },
      }),
    ).rejects.toThrow(InvalidCurrentPasswordError);
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it("lança EmailAlreadyInUseError quando o novo email já é de outro usuário", async () => {
    const passwordHash = await argon2.hash("senha1234");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
    };
    const repository = fakeUpdateUserRepository({
      findUserById: vi.fn().mockResolvedValue(user),
      findUserByEmail: vi.fn().mockResolvedValue({ id: "outro-user" }),
    });

    await expect(
      updateCurrentUser(repository, {
        userId: "user-1",
        data: {
          email: "bia@example.com",
          currentPassword: "senha1234",
        },
      }),
    ).rejects.toThrow(EmailAlreadyInUseError);
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it("permite manter o próprio email (não conflita consigo mesmo)", async () => {
    const passwordHash = await argon2.hash("senha1234");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
    };
    const repository = fakeUpdateUserRepository({
      findUserById: vi.fn().mockResolvedValue(user),
      findUserByEmail: vi.fn().mockResolvedValue(user),
      updateUser: vi.fn().mockResolvedValue(user),
    });

    await expect(
      updateCurrentUser(repository, {
        userId: "user-1",
        data: { email: "ana@example.com", currentPassword: "senha1234" },
      }),
    ).resolves.toEqual(user);
  });

  it("ao trocar a senha, grava o hash novo (nunca texto puro) e revoga todos os refresh tokens", async () => {
    const passwordHash = await argon2.hash("senha-atual");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
    };
    const repository = fakeUpdateUserRepository({
      findUserById: vi.fn().mockResolvedValue(user),
      updateUser: vi.fn().mockResolvedValue(user),
    });

    await updateCurrentUser(repository, {
      userId: "user-1",
      data: { password: "senha-nova-123", currentPassword: "senha-atual" },
    });

    const updateData = vi.mocked(repository.updateUser).mock.calls[0][1];
    expect(updateData.passwordHash).not.toBe("senha-nova-123");
    await expect(
      argon2.verify(updateData.passwordHash as string, "senha-nova-123"),
    ).resolves.toBe(true);
    expect(repository.revokeAllRefreshTokensByUserId).toHaveBeenCalledWith(
      "user-1",
    );
  });

  it("não revoga refresh tokens quando só nome/email mudam", async () => {
    const passwordHash = await argon2.hash("senha1234");
    const user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash,
      name: "Ana",
      avatarUrl: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
    };
    const repository = fakeUpdateUserRepository({
      findUserById: vi.fn().mockResolvedValue(user),
      updateUser: vi.fn().mockResolvedValue(user),
    });

    await updateCurrentUser(repository, {
      userId: "user-1",
      data: { name: "Ana Nova" },
    });

    expect(repository.revokeAllRefreshTokensByUserId).not.toHaveBeenCalled();
  });
});
