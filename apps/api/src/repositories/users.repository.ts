import { eq } from "drizzle-orm";
import { users, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UsersRepository = {
  findUserById(id: string): Promise<UserRecord | undefined>;
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  insertUser(data: {
    email: string;
    passwordHash: string;
  }): Promise<UserRecord>;
  updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      avatarUrl?: string;
    },
  ): Promise<UserRecord | undefined>;
};

export function createUsersRepository(db: DbClient): UsersRepository {
  return {
    async findUserById(id) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return rows[0];
    },

    async findUserByEmail(email) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return rows[0];
    },

    async insertUser({ email, passwordHash }) {
      const rows = await db
        .insert(users)
        .values({ email, passwordHash })
        .returning();

      return rows[0];
    },

    async updateUser(id, data) {
      const rows = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      return rows[0];
    },
  };
}
