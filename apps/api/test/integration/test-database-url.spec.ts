import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEST_DATABASE_URL,
  getDatabaseName,
  getMaintenanceDatabaseUrl,
  resolveTestDatabaseUrl,
} from "./test-database-url";

describe("resolveTestDatabaseUrl", () => {
  it("usa o banco devlib_test local quando TEST_DATABASE_URL não está definida", () => {
    expect(resolveTestDatabaseUrl({})).toBe(DEFAULT_TEST_DATABASE_URL);
    expect(getDatabaseName(DEFAULT_TEST_DATABASE_URL)).toBe("devlib_test");
  });

  it("usa TEST_DATABASE_URL quando definida e o banco termina em _test", () => {
    const url = "postgresql://ci:ci@db:5432/outro_test";

    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: url })).toBe(url);
  });

  it("ignora DATABASE_URL — nunca herda o banco de desenvolvimento/produção", () => {
    expect(
      resolveTestDatabaseUrl({
        DATABASE_URL: "postgresql://devlib:devlib@localhost:5432/devlib",
      }),
    ).toBe(DEFAULT_TEST_DATABASE_URL);
  });

  it("recusa um banco sem o sufixo _test", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://devlib:devlib@localhost:5432/devlib",
      }),
    ).toThrow(/_test/);
  });

  it("recusa um banco que só contém _test no meio do nome", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL:
          "postgresql://devlib:devlib@localhost:5432/devlib_test_prod",
      }),
    ).toThrow(/_test/);
  });

  it("recusa nome de banco com caracteres fora de [a-z0-9_]", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: 'postgresql://devlib:devlib@localhost:5432/x";_test',
      }),
    ).toThrow();
  });
});

describe("getMaintenanceDatabaseUrl", () => {
  it("troca só o nome do banco por postgres, mantendo credenciais e host", () => {
    expect(
      getMaintenanceDatabaseUrl("postgresql://ci:segredo@db:6543/devlib_test"),
    ).toBe("postgresql://ci:segredo@db:6543/postgres");
  });
});
