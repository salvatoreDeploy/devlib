import { describe, it, expect, vi } from "vitest";
import { createUsersRepository, type DbClient } from "./users.repository";

function fakeDbForSelect(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from, where, limit };
}

function fakeDbForInsert(row: unknown) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  return { db: { insert } as unknown as DbClient, insert, values, returning };
}

describe("createUsersRepository", () => {
  describe("findUserByEmail", () => {
    it("retorna o usuário quando o email existe", async () => {
      const user = {
        id: "user-1",
        email: "ana@example.com",
        passwordHash: "hash",
        createdAt: new Date("2026-08-29T00:00:00Z"),
      };
      const { db, select } = fakeDbForSelect([user]);

      const repository = createUsersRepository(db);
      const result = await repository.findUserByEmail("ana@example.com");

      expect(result).toEqual(user);
      expect(select).toHaveBeenCalledOnce();
    });

    it("retorna undefined quando o email não existe", async () => {
      const { db } = fakeDbForSelect([]);

      const repository = createUsersRepository(db);
      const result = await repository.findUserByEmail("ninguem@example.com");

      expect(result).toBeUndefined();
    });
  });

  describe("insertUser", () => {
    it("insere e retorna o usuário criado", async () => {
      const created = {
        id: "user-2",
        email: "bia@example.com",
        passwordHash: "hash-forte",
        createdAt: new Date("2026-08-29T00:00:00Z"),
      };
      const { db, values } = fakeDbForInsert(created);

      const repository = createUsersRepository(db);
      const result = await repository.insertUser({
        email: "bia@example.com",
        passwordHash: "hash-forte",
      });

      expect(result).toEqual(created);
      expect(values).toHaveBeenCalledWith({
        email: "bia@example.com",
        passwordHash: "hash-forte",
      });
    });
  });
});
