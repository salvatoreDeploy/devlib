import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { buildServer } from "../server";
import { signRefreshToken } from "../services/token.service";
import type { RefreshRepository } from "../services/auth.service";
import type { AuthConfig } from "../config/env";

const fakeAuthConfig: AuthConfig = {
  jwtSecret: "access-secret",
  jwtRefreshSecret: "refresh-secret",
  accessExpiresIn: "15m",
  refreshExpiresIn: "7d",
};

function fakeRefreshRepository(
  overrides: Partial<RefreshRepository> = {},
): RefreshRepository {
  return {
    findRefreshTokenByHash: vi.fn().mockResolvedValue(undefined),
    revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
    insertRefreshToken: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("POST /auth/refresh", () => {
  it("retorna 200 com um novo accessToken e refreshToken válidos", async () => {
    const { token } = signRefreshToken(
      { sub: "user-1", email: "ana@example.com" },
      fakeAuthConfig.jwtRefreshSecret,
      "7d",
    );
    const app = buildServer({
      refreshRepository: fakeRefreshRepository({
        findRefreshTokenByHash: vi.fn().mockResolvedValue({
          id: "token-row-1",
          userId: "user-1",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          revokedAt: null,
        }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: token },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(
      jwt.verify(body.accessToken, fakeAuthConfig.jwtSecret),
    ).toMatchObject({ sub: "user-1", email: "ana@example.com" });
    expect(body.refreshToken).not.toBe(token);
  });

  it("retorna 401 quando o refresh token é inválido", async () => {
    const app = buildServer({
      refreshRepository: fakeRefreshRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "token-invalido" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 401 quando o refresh token já foi revogado", async () => {
    const { token } = signRefreshToken(
      { sub: "user-1", email: "ana@example.com" },
      fakeAuthConfig.jwtRefreshSecret,
      "7d",
    );
    const app = buildServer({
      refreshRepository: fakeRefreshRepository({
        findRefreshTokenByHash: vi.fn().mockResolvedValue({
          id: "token-row-1",
          userId: "user-1",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          revokedAt: new Date("2026-08-01T00:00:00Z"),
        }),
      }),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: token },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toHaveProperty("error");
  });

  it("retorna 400 quando refreshToken está ausente", async () => {
    const app = buildServer({
      refreshRepository: fakeRefreshRepository(),
      authConfig: fakeAuthConfig,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });
});
