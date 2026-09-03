import { eq } from "drizzle-orm";
import { libraries, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type LibraryRecord = {
  id: string;
  name: string;
  categoryId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LibrariesRepository = {
  insertLibrary(data: {
    name: string;
    categoryId?: string | null;
    notes?: string | null;
  }): Promise<LibraryRecord>;
  findLibraries(): Promise<LibraryRecord[]>;
  findLibraryById(id: string): Promise<LibraryRecord | undefined>;
  findLibraryByName(name: string): Promise<LibraryRecord | undefined>;
  updateLibrary(
    id: string,
    data: { name?: string; categoryId?: string | null; notes?: string | null },
  ): Promise<LibraryRecord | undefined>;
  deleteLibrary(id: string): Promise<void>;
};

export function createLibrariesRepository(db: DbClient): LibrariesRepository {
  return {
    async insertLibrary({ name, categoryId, notes }) {
      const rows = await db
        .insert(libraries)
        .values({
          name,
          categoryId: categoryId ?? null,
          notes: notes ?? null,
        })
        .returning();

      return rows[0];
    },

    async findLibraries() {
      return db.select().from(libraries);
    },

    async findLibraryById(id) {
      const rows = await db
        .select()
        .from(libraries)
        .where(eq(libraries.id, id))
        .limit(1);

      return rows[0];
    },

    async findLibraryByName(name) {
      const rows = await db
        .select()
        .from(libraries)
        .where(eq(libraries.name, name))
        .limit(1);

      return rows[0];
    },

    async updateLibrary(id, data) {
      const rows = await db
        .update(libraries)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(libraries.id, id))
        .returning();

      return rows[0];
    },

    async deleteLibrary(id) {
      await db.delete(libraries).where(eq(libraries.id, id));
    },
  };
}
