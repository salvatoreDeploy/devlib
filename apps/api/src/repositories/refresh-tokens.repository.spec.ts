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
});
