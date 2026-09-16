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

function fakeDbForUpdate(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  return {
    db: { update } as unknown as DbClient,
    update,
    set,
    where,
    returning,
  };
}

describe("createUsersRepository", () => {
  describe("findUserById", () => {
    it("retorna o usuário quando o id existe", async () => {
      const user = {
        id: "user-1",
        email: "ana@example.com",
        passwordHash: "hash",
        name: "Ana",
        avatarUrl: null,
        createdAt: new Date("2026-08-29T00:00:00Z"),
        updatedAt: new Date("2026-08-29T00:00:00Z"),
      };
      const { db, select } = fakeDbForSelect([user]);

      const repository = createUsersRepository(db);
      const result = await repository.findUserById("user-1");

      expect(result).toEqual(user);
      expect(select).toHaveBeenCalledOnce();
    });

    it("retorna undefined quando o id não existe", async () => {
      const { db } = fakeDbForSelect([]);

      const repository = createUsersRepository(db);
      const result = await repository.findUserById("id-inexistente");

      expect(result).toBeUndefined();
    });
  });

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

  describe("updateUser", () => {
    it("atualiza e retorna o usuário", async () => {
      const updated = {
        id: "user-1",
        email: "ana-nova@example.com",
        passwordHash: "hash",
        name: "Ana Nova",
        avatarUrl: null,
        createdAt: new Date("2026-08-29T00:00:00Z"),
        updatedAt: new Date("2026-09-13T00:00:00Z"),
      };
      const { db, set, where } = fakeDbForUpdate([updated]);

      const repository = createUsersRepository(db);
      const result = await repository.updateUser("user-1", {
        name: "Ana Nova",
        email: "ana-nova@example.com",
      });

      expect(result).toEqual(updated);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Ana Nova",
          email: "ana-nova@example.com",
          updatedAt: expect.any(Date),
        }),
      );
      expect(where).toHaveBeenCalledOnce();
    });

    it("retorna undefined quando o id não existe", async () => {
      const { db } = fakeDbForUpdate([]);

      const repository = createUsersRepository(db);
      const result = await repository.updateUser("id-inexistente", {
        name: "Alguém",
      });

      expect(result).toBeUndefined();
    });

    it("atualiza avatarUrl", async () => {
      const updated = {
        id: "user-1",
        email: "ana@example.com",
        passwordHash: "hash",
        name: "Ana",
        avatarUrl: "/uploads/avatars/novo.png",
        createdAt: new Date("2026-08-29T00:00:00Z"),
        updatedAt: new Date("2026-09-16T00:00:00Z"),
      };
      const { db, set } = fakeDbForUpdate([updated]);

      const repository = createUsersRepository(db);
      const result = await repository.updateUser("user-1", {
        avatarUrl: "/uploads/avatars/novo.png",
      });

      expect(result).toEqual(updated);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: "/uploads/avatars/novo.png" }),
      );
    });
  });
});
