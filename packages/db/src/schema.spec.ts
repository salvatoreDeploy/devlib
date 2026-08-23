import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { users, refreshTokens } from "./schema";

describe("users", () => {
  it("tem as colunas esperadas", () => {
    const columns = getTableColumns(users);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "email",
        "passwordHash",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("email é obrigatório e único", () => {
    const columns = getTableColumns(users);

    expect(columns.email.notNull).toBe(true);
    expect(columns.email.isUnique).toBe(true);
  });

  it("passwordHash é obrigatório", () => {
    const columns = getTableColumns(users);

    expect(columns.passwordHash.notNull).toBe(true);
  });
});

describe("refreshTokens", () => {
  it("tem as colunas esperadas", () => {
    const columns = getTableColumns(refreshTokens);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "userId",
        "tokenHash",
        "expiresAt",
        "createdAt",
        "revokedAt",
      ]),
    );
  });

  it("userId, tokenHash e expiresAt são obrigatórios", () => {
    const columns = getTableColumns(refreshTokens);

    expect(columns.userId.notNull).toBe(true);
    expect(columns.tokenHash.notNull).toBe(true);
    expect(columns.expiresAt.notNull).toBe(true);
  });

  it("revokedAt é opcional", () => {
    const columns = getTableColumns(refreshTokens);

    expect(columns.revokedAt.notNull).toBe(false);
  });
});
