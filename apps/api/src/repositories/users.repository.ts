import { eq } from "drizzle-orm";
import { users, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type UsersRepository = {
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  insertUser(data: {
    email: string;
    passwordHash: string;
  }): Promise<UserRecord>;
};

export function createUsersRepository(db: DbClient): UsersRepository {
  return {
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
  };
}
