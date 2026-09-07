import { and, eq } from "drizzle-orm";
import { projectLibraries, projects, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type ProjectRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LibraryProjectRecord = ProjectRecord & {
  version: string | null;
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
  findProjectsByLibraryId(
    libraryId: string,
    userId: string,
  ): Promise<LibraryProjectRecord[]>;
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

    async findProjectsByLibraryId(libraryId, userId) {
      return db
        .select({
          id: projects.id,
          userId: projects.userId,
          name: projects.name,
          description: projects.description,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          version: projectLibraries.version,
        })
        .from(projectLibraries)
        .innerJoin(projects, eq(projectLibraries.projectId, projects.id))
        .where(
          and(
            eq(projectLibraries.libraryId, libraryId),
            eq(projects.userId, userId),
          ),
        );
    },
  };
}
