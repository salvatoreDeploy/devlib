import { and, eq } from "drizzle-orm";
import { projects, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type ProjectRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectsRepository = {
  insertProject(data: {
    userId: string;
    name: string;
    description?: string | null;
  }): Promise<ProjectRecord>;
  findProjectsByUserId(userId: string): Promise<ProjectRecord[]>;
  findProjectById(id: string): Promise<ProjectRecord | undefined>;
  findProjectByUserIdAndName(
    userId: string,
    name: string,
  ): Promise<ProjectRecord | undefined>;
  updateProject(
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<ProjectRecord | undefined>;
  deleteProject(id: string): Promise<void>;
};

export function createProjectsRepository(db: DbClient): ProjectsRepository {
  return {
    async insertProject({ userId, name, description }) {
      const rows = await db
        .insert(projects)
        .values({ userId, name, description: description ?? null })
        .returning();

      return rows[0];
    },

    async findProjectsByUserId(userId) {
      return db.select().from(projects).where(eq(projects.userId, userId));
    },

    async findProjectById(id) {
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      return rows[0];
    },

    async findProjectByUserIdAndName(userId, name) {
      const rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.name, name)))
        .limit(1);

      return rows[0];
    },

    async updateProject(id, data) {
      const rows = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      return rows[0];
    },

    async deleteProject(id) {
      await db.delete(projects).where(eq(projects.id, id));
    },
  };
}
