import { and, count, eq } from "drizzle-orm";
import {
  libraries,
  projectLibraries,
  projects,
  type createDb,
} from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type LibraryRecord = {
  id: string;
  name: string;
  categoryId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectLibraryRecord = LibraryRecord & {
  version: string | null;
};

export type LibraryOverviewRecord = LibraryRecord & {
  projectsCount: number;
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
  findLibrariesByProjectId(projectId: string): Promise<ProjectLibraryRecord[]>;
  findLibrariesOverview(userId: string): Promise<LibraryOverviewRecord[]>;
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

    async findLibrariesByProjectId(projectId) {
      return db
        .select({
          id: libraries.id,
          name: libraries.name,
          categoryId: libraries.categoryId,
          notes: libraries.notes,
          createdAt: libraries.createdAt,
          updatedAt: libraries.updatedAt,
          version: projectLibraries.version,
        })
        .from(projectLibraries)
        .innerJoin(libraries, eq(projectLibraries.libraryId, libraries.id))
        .where(eq(projectLibraries.projectId, projectId));
    },

    async findLibrariesOverview(userId) {
      return db
        .select({
          id: libraries.id,
          name: libraries.name,
          categoryId: libraries.categoryId,
          notes: libraries.notes,
          createdAt: libraries.createdAt,
          updatedAt: libraries.updatedAt,
          projectsCount: count(projects.id),
        })
        .from(libraries)
        .leftJoin(
          projectLibraries,
          eq(projectLibraries.libraryId, libraries.id),
        )
        .leftJoin(
          projects,
          and(
            eq(projects.id, projectLibraries.projectId),
            eq(projects.userId, userId),
          ),
        )
        .groupBy(libraries.id);
    },
  };
}
