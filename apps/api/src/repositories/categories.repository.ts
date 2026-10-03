import { and, eq, isNull, or } from "drizzle-orm";
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
  findCategoriesForProject(projectId: string): Promise<CategoryRecord[]>;
  findCategoryByProjectIdAndName(
    projectId: string,
    name: string,
  ): Promise<CategoryRecord | undefined>;
  insertCategory(data: {
    projectId: string;
    name: string;
  }): Promise<CategoryRecord>;
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

    async findCategoriesForProject(projectId) {
      return db
        .select()
        .from(categories)
        .where(
          or(isNull(categories.projectId), eq(categories.projectId, projectId)),
        );
    },

    async findCategoryByProjectIdAndName(projectId, name) {
      const rows = await db
        .select()
        .from(categories)
        .where(
          and(eq(categories.projectId, projectId), eq(categories.name, name)),
        )
        .limit(1);

      return rows[0];
    },

    async insertCategory({ projectId, name }) {
      const rows = await db
        .insert(categories)
        .values({ projectId, name })
        .returning();

      return rows[0];
    },
  };
}
