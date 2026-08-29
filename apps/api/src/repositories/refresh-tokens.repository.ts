import { refreshTokens, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type RefreshTokensRepository = {
  insertRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
};

export function createRefreshTokensRepository(
  db: DbClient,
): RefreshTokensRepository {
  return {
    async insertRefreshToken({ userId, tokenHash, expiresAt }) {
      await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
    },
  };
}
