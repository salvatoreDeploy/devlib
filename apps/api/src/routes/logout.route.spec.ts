import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { signRefreshToken } from "../services/token.service";
import type { RefreshRepository } from "../services/auth.service";

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

describe("POST /auth/logout", () => {
  it("retorna 204 e revoga o refresh token quando ele existe", async () => {
    const { token } = signRefreshToken(
      { sub: "user-1", email: "ana@example.com" },
      "refresh-secret",
      "7d",
    );
    const repository = fakeRefreshRepository({
      findRefreshTokenByHash: vi.fn().mockResolvedValue({
        id: "token-row-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
      }),
    });
    const app = buildServer({ refreshRepository: repository });

    const response = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: token },
    });

    expect(response.statusCode).toBe(204);
    expect(repository.revokeRefreshToken).toHaveBeenCalledWith("token-row-1");
  });

  it("retorna 204 mesmo quando o refresh token não existe/já foi revogado (idempotente)", async () => {
    const app = buildServer({
      refreshRepository: fakeRefreshRepository(),
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: "token-desconhecido" },
    });

    expect(response.statusCode).toBe(204);
  });

  it("retorna 400 quando refreshToken está ausente", async () => {
    const app = buildServer({
      refreshRepository: fakeRefreshRepository(),
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});
