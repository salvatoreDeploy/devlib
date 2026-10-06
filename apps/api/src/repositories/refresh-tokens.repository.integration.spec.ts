import { describe, expect, it } from "vitest";
import { refreshTokens, users } from "@devlib/db";
import { eq } from "drizzle-orm";
import { createRefreshTokensRepository } from "./refresh-tokens.repository";
import { getTestDb, insertUser } from "../../test/integration/test-db";

const inOneHour = () => new Date(Date.now() + 1000 * 60 * 60);

describe("createRefreshTokensRepository (Postgres real)", () => {
  it("insertRefreshToken grava e findRefreshTokenByHash encontra pelo hash, ainda não revogado", async () => {
    const user = await insertUser("ana@example.com");
    const repository = createRefreshTokensRepository(getTestDb());
    const expiresAt = inOneHour();

    await repository.insertRefreshToken({
      userId: user.id,
      tokenHash: "hash-1",
      expiresAt,
    });

    const found = await repository.findRefreshTokenByHash("hash-1");
    expect(found).toMatchObject({ userId: user.id, revokedAt: null });
    expect(found!.expiresAt.getTime()).toBe(expiresAt.getTime());
    expect(await repository.findRefreshTokenByHash("outro")).toBeUndefined();
  });

  it("revokeRefreshToken preenche revokedAt só do token informado", async () => {
    const user = await insertUser("ana@example.com");
    const repository = createRefreshTokensRepository(getTestDb());
    await repository.insertRefreshToken({
      userId: user.id,
      tokenHash: "hash-1",
      expiresAt: inOneHour(),
    });
    await repository.insertRefreshToken({
      userId: user.id,
      tokenHash: "hash-2",
      expiresAt: inOneHour(),
    });
    const first = await repository.findRefreshTokenByHash("hash-1");

    await repository.revokeRefreshToken(first!.id);

    expect(
      (await repository.findRefreshTokenByHash("hash-1"))!.revokedAt,
    ).toBeInstanceOf(Date);
    expect(
      (await repository.findRefreshTokenByHash("hash-2"))!.revokedAt,
    ).toBeNull();
  });

  it("revokeAllRefreshTokensByUserId revoga todos do usuário sem tocar nos de outro usuário", async () => {
    const ana = await insertUser("ana@example.com");
    const bia = await insertUser("bia@example.com");
    const repository = createRefreshTokensRepository(getTestDb());
    for (const [userId, tokenHash] of [
      [ana.id, "ana-1"],
      [ana.id, "ana-2"],
      [bia.id, "bia-1"],
    ]) {
      await repository.insertRefreshToken({
        userId,
        tokenHash,
        expiresAt: inOneHour(),
      });
    }

    await repository.revokeAllRefreshTokensByUserId(ana.id);

    expect(
      (await repository.findRefreshTokenByHash("ana-1"))!.revokedAt,
    ).not.toBeNull();
    expect(
      (await repository.findRefreshTokenByHash("ana-2"))!.revokedAt,
    ).not.toBeNull();
    expect(
      (await repository.findRefreshTokenByHash("bia-1"))!.revokedAt,
    ).toBeNull();
  });

  it("excluir o usuário remove os refresh tokens dele (on delete cascade)", async () => {
    const user = await insertUser("ana@example.com");
    const repository = createRefreshTokensRepository(getTestDb());
    await repository.insertRefreshToken({
      userId: user.id,
      tokenHash: "hash-1",
      expiresAt: inOneHour(),
    });

    await getTestDb().delete(users).where(eq(users.id, user.id));

    expect(await getTestDb().select().from(refreshTokens)).toHaveLength(0);
  });
});
