import { describe, it, expect, vi } from "vitest";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import {
  registerUser,
  EmailAlreadyInUseError,
  loginUser,
  InvalidCredentialsError,
  type AuthRepository,
  type LoginRepository,
} from "./auth.service";
import { hashToken } from "./token.service";
import type { AuthConfig } from "../config/env";

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

describe("loginUser", () => {
  it("lança InvalidCredentialsError quando o email não existe", async () => {
    const repository = fakeLoginRepository();

    await expect(
      loginUser(repository, fakeAuthConfig, {
        email: "ana@example.com",
        password: "senha1234",
      }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(repository.insertRefreshToken).not.toHaveBeenCalled();
  });

  it("lança InvalidCredentialsError quando a senha está errada", async () => {
    const passwordHash = await argon2.hash("senha-correta");
    const repository = fakeLoginRepository({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "ana@example.com",
        passwordHash,
      }),
    });

    await expect(
      loginUser(repository, fakeAuthConfig, {
        email: "ana@example.com",
        password: "senha-errada",
      }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(repository.insertRefreshToken).not.toHaveBeenCalled();
  });

  it("retorna accessToken e refreshToken válidos e persiste o hash do refresh token", async () => {
    const passwordHash = await argon2.hash("senha1234");
    const repository = fakeLoginRepository({
      findUserByEmail: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "ana@example.com",
        passwordHash,
      }),
    });

    const result = await loginUser(repository, fakeAuthConfig, {
      email: "ana@example.com",
      password: "senha1234",
    });

    const decodedAccess = jwt.verify(
      result.accessToken,
      fakeAuthConfig.jwtSecret,
    ) as { sub: string; email: string };
    expect(decodedAccess.sub).toBe("user-1");
    expect(decodedAccess.email).toBe("ana@example.com");

    const decodedRefresh = jwt.verify(
      result.refreshToken,
      fakeAuthConfig.jwtRefreshSecret,
    ) as { sub: string; email: string; exp: number };
    expect(decodedRefresh.sub).toBe("user-1");
    expect(decodedRefresh.email).toBe("ana@example.com");

    expect(repository.insertRefreshToken).toHaveBeenCalledWith({
      userId: "user-1",
      tokenHash: hashToken(result.refreshToken),
      expiresAt: new Date(decodedRefresh.exp * 1000),
    });
  });
});
