import { describe, it, expect, afterEach } from "vitest";
import { createDb, getDatabaseUrl } from "./client";

describe("getDatabaseUrl", () => {
  const originalUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
  });

  it("retorna o valor de DATABASE_URL quando definida", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/devlib";

    expect(getDatabaseUrl()).toBe(
      "postgresql://user:pass@localhost:5432/devlib",
    );
  });

  it("lança erro claro quando DATABASE_URL não está definida", () => {
    delete process.env.DATABASE_URL;

    expect(() => getDatabaseUrl()).toThrow(/DATABASE_URL/);
  });

  it("lança erro claro quando DATABASE_URL não é uma URL válida", () => {
    process.env.DATABASE_URL = "isso-nao-e-uma-url";

    expect(() => getDatabaseUrl()).toThrow(/DATABASE_URL/);
  });
});

describe("createDb", () => {
  it("cria uma instância do Drizzle sem abrir conexão de verdade", () => {
    const db = createDb("postgresql://user:pass@localhost:5432/devlib");

    expect(db).toBeDefined();
    expect(typeof db.select).toBe("function");
  });
});
