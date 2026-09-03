import { eq, isNull } from "drizzle-orm";
import { categories, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type CategoryRecord = {
  id: string;
  projectId: string | null;
  name: string;
  createdAt: Date;
};

export type CategoriesRepository = {
  findCategoryById(id: string): Promise<CategoryRecord | undefined>;
  findGlobalCategories(): Promise<CategoryRecord[]>;
};

export function createCategoriesRepository(db: DbClient): CategoriesRepository {
  return {
    async findCategoryById(id) {
      const rows = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      return rows[0];
    },

    async findGlobalCategories() {
      return db.select().from(categories).where(isNull(categories.projectId));
    },
  };
}
