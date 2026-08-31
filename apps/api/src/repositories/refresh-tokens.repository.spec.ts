import { describe, expect, it, vi } from "vitest";
import {
  createRefreshTokensRepository,
  type DbClient,
} from "./refresh-tokens.repository";

function fakeDbForInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });

  return { db: { insert } as unknown as DbClient, insert, values };
}

function fakeDbForSelect(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from, where, limit };
}

function fakeDbForUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  return { db: { update } as unknown as DbClient, update, set, where };
}

describe("createRefreshTokensRepository", () => {
  describe("insertRefreshToken", () => {
    it("insere o refresh token com os dados corretos", async () => {
      const { db, values } = fakeDbForInsert();
      const expiresAt = new Date("2026-09-05T00:00:00Z");

      const repository = createRefreshTokensRepository(db);
      await repository.insertRefreshToken({
        userId: "user-1",
        tokenHash: "hash-do-token",
        expiresAt,
      });

      expect(values).toHaveBeenCalledWith({
        userId: "user-1",
        tokenHash: "hash-do-token",
        expiresAt,
      });
    });
  });

  describe("findRefreshTokenByHash", () => {
    it("retorna o registro quando o hash existe", async () => {
      const row = {
        id: "token-1",
        userId: "user-1",
        expiresAt: new Date("2026-09-05T00:00:00Z"),
        revokedAt: null,
      };
      const { db, select } = fakeDbForSelect([row]);

      const repository = createRefreshTokensRepository(db);
      const result = await repository.findRefreshTokenByHash("hash-do-token");

      expect(result).toEqual(row);
      expect(select).toHaveBeenCalledOnce();
    });

    it("retorna undefined quando o hash não existe", async () => {
      const { db } = fakeDbForSelect([]);

      const repository = createRefreshTokensRepository(db);
      const result =
        await repository.findRefreshTokenByHash("hash-inexistente");

      expect(result).toBeUndefined();
    });
  });

  describe("revokeRefreshToken", () => {
    it("marca o token como revogado, gravando revokedAt", async () => {
      const { db, set, where } = fakeDbForUpdate();

      const repository = createRefreshTokensRepository(db);
      await repository.revokeRefreshToken("token-1");

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
      expect(where).toHaveBeenCalledOnce();
    });
  });
});
