import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  users,
  refreshTokens,
  categories,
  tags,
  projects,
  libraries,
  projectLibraries,
  libraryTags,
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
      expect.arrayContaining(["id", "projectId", "name", "createdAt"]),
    );
  });

  it("name é obrigatório; projectId é opcional (null = categoria predefinida/global)", () => {
    const columns = getTableColumns(categories);

    expect(columns.name.notNull).toBe(true);
    expect(columns.projectId.notNull).toBe(false);
  });

  it("nome é único dentro do mesmo projeto (constraint composta project_id+name)", () => {
    const { uniqueConstraints } = getTableConfig(categories);

    const composite = uniqueConstraints.find(
      (constraint) =>
        constraint.columns
          .map((column) => column.name)
          .sort()
          .join(",") === "name,project_id",
    );
    expect(composite).toBeDefined();
  });

  it("nome é único entre as categorias globais (índice único parcial project_id IS NULL)", () => {
    const { indexes } = getTableConfig(categories);

    const globalNameIndex = indexes.find(
      (index) => index.config.name === "categories_global_name_unique",
    );
    expect(globalNameIndex).toBeDefined();
    expect(globalNameIndex?.config.unique).toBe(true);
    expect(globalNameIndex?.config.columns.map((c) => c.name)).toEqual([
      "name",
    ]);
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

describe("projectLibraries", () => {
  it("tem as colunas esperadas", () => {
    const columns = getTableColumns(projectLibraries);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "projectId",
        "libraryId",
        "version",
        "createdAt",
      ]),
    );
  });

  it("projectId e libraryId são obrigatórios", () => {
    const columns = getTableColumns(projectLibraries);

    expect(columns.projectId.notNull).toBe(true);
    expect(columns.libraryId.notNull).toBe(true);
  });

  it("version é opcional", () => {
    const columns = getTableColumns(projectLibraries);

    expect(columns.version.notNull).toBe(false);
  });
});

describe("libraryTags", () => {
  it("tem as colunas esperadas (chave composta, sem id próprio)", () => {
    const columns = getTableColumns(libraryTags);

    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining(["libraryId", "tagId"]),
    );
    expect(columns.id).toBeUndefined();
  });

  it("libraryId e tagId são obrigatórios", () => {
    const columns = getTableColumns(libraryTags);

    expect(columns.libraryId.notNull).toBe(true);
    expect(columns.tagId.notNull).toBe(true);
  });
});
