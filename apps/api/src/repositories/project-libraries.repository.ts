import { and, eq } from "drizzle-orm";
import { projectLibraries, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type ProjectLibraryRecord = {
  id: string;
  projectId: string;
  libraryId: string;
  version: string | null;
  createdAt: Date;
};

export type ProjectLibrariesRepository = {
  findProjectLibrary(
    projectId: string,
    libraryId: string,
  ): Promise<ProjectLibraryRecord | undefined>;
  insertProjectLibrary(data: {
    projectId: string;
    libraryId: string;
    version: string | null;
  }): Promise<ProjectLibraryRecord>;
  deleteProjectLibrary(projectId: string, libraryId: string): Promise<boolean>;
};

function byProjectAndLibrary(projectId: string, libraryId: string) {
  return and(
    eq(projectLibraries.projectId, projectId),
    eq(projectLibraries.libraryId, libraryId),
  );
}

export function createProjectLibrariesRepository(
  db: DbClient,
): ProjectLibrariesRepository {
  return {
    async findProjectLibrary(projectId, libraryId) {
      const rows = await db
        .select()
        .from(projectLibraries)
        .where(byProjectAndLibrary(projectId, libraryId))
        .limit(1);

      return rows[0];
    },

    async insertProjectLibrary({ projectId, libraryId, version }) {
      const rows = await db
        .insert(projectLibraries)
        .values({ projectId, libraryId, version })
        .returning();

      return rows[0];
    },

    // RETURNING diz se havia linha pra remover — o service usa isso pro 404
    // sem precisar de um find antes (e sem corrida entre os dois)
    async deleteProjectLibrary(projectId, libraryId) {
      const rows = await db
        .delete(projectLibraries)
        .where(byProjectAndLibrary(projectId, libraryId))
        .returning({ id: projectLibraries.id });

      return rows.length > 0;
    },
  };
}
