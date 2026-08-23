import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import {
  users,
  refreshTokens,
  categories,
  tags,
  projects,
  libraries,
} from "./schema";

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

describe("categories", () => {
  it("tem as colunas esperadas", () => {
    const columns = getTableColumns(categories);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "name", "createdAt"]),
    );
  });

  it("name é obrigatório e único", () => {
    const columns = getTableColumns(categories);

    expect(columns.name.notNull).toBe(true);
    expect(columns.name.isUnique).toBe(true);
  });
});

describe("tags", () => {
  it("tem as colunas esperadas", () => {
    const columns = getTableColumns(tags);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["id", "name", "createdAt"]),
    );
  });

  it("name é obrigatório e único", () => {
    const columns = getTableColumns(tags);

    expect(columns.name.notNull).toBe(true);
    expect(columns.name.isUnique).toBe(true);
  });
});

describe("projects", () => {
  it("tem as colunas esperadas", () => {
    const columns = getTableColumns(projects);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "userId",
        "name",
        "description",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("userId e name são obrigatórios", () => {
    const columns = getTableColumns(projects);

    expect(columns.userId.notNull).toBe(true);
    expect(columns.name.notNull).toBe(true);
  });

  it("description é opcional", () => {
    const columns = getTableColumns(projects);

    expect(columns.description.notNull).toBe(false);
  });
});

describe("libraries", () => {
  it("tem as colunas esperadas", () => {
    const columns = getTableColumns(libraries);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "categoryId",
        "notes",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("name é obrigatório e único", () => {
    const columns = getTableColumns(libraries);

    expect(columns.name.notNull).toBe(true);
    expect(columns.name.isUnique).toBe(true);
  });

  it("categoryId e notes são opcionais", () => {
    const columns = getTableColumns(libraries);

    expect(columns.categoryId.notNull).toBe(false);
    expect(columns.notes.notNull).toBe(false);
  });
});
