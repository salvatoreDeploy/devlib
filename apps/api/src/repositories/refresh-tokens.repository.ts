import { eq } from "drizzle-orm";
import { refreshTokens, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type RefreshTokensRepository = {
  insertRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshTokenRecord | undefined>;
  revokeRefreshToken(id: string): Promise<void>;
};

export function createRefreshTokensRepository(
  db: DbClient,
): RefreshTokensRepository {
  return {
    async insertRefreshToken({ userId, tokenHash, expiresAt }) {
      await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
    },

    async findRefreshTokenByHash(tokenHash) {
      const rows = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      return rows[0];
    },

    async revokeRefreshToken(id) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, id));
    },
  };
}
