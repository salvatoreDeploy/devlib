import type {
  ProjectLibraryRecord,
  ProjectLibrariesRepository as ProjectLibrariesDataRepository,
} from "../repositories/project-libraries.repository";
import type { ProjectRecord } from "../repositories/projects.repository";
import type { LibraryRecord } from "../repositories/libraries.repository";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../repositories/pg-errors";
import { ProjectNotFoundError } from "./projects.service";
import { LibraryNotFoundError } from "./libraries.service";

export type { ProjectLibraryRecord };
export { ProjectNotFoundError, LibraryNotFoundError };

export type ProjectLibrariesRepository = ProjectLibrariesDataRepository & {
  findProjectById(id: string): Promise<ProjectRecord | undefined>;
  findLibraryById(id: string): Promise<LibraryRecord | undefined>;
};

export class ProjectLibraryAlreadyExistsError extends Error {
  constructor() {
    super("Essa biblioteca já está associada ao projeto");
    this.name = "ProjectLibraryAlreadyExistsError";
  }
}

export class ProjectLibraryNotFoundError extends Error {
  constructor() {
    super("Biblioteca não associada a esse projeto");
    this.name = "ProjectLibraryNotFoundError";
  }
}

async function assertProjectOwnedByUser(
  repository: ProjectLibrariesRepository,
  userId: string,
  projectId: string,
): Promise<void> {
  const project = await repository.findProjectById(projectId);

  if (!project || project.userId !== userId) {
    throw new ProjectNotFoundError();
  }
}

export type AssociateLibraryInput = {
  userId: string;
  projectId: string;
  libraryId: string;
  version?: string | null;
};

export async function associateLibraryToProject(
  repository: ProjectLibrariesRepository,
  input: AssociateLibraryInput,
): Promise<ProjectLibraryRecord> {
  await assertProjectOwnedByUser(repository, input.userId, input.projectId);

  // catálogo de bibliotecas é global — basta existir, não tem dono
  const library = await repository.findLibraryById(input.libraryId);

  if (!library) {
    throw new LibraryNotFoundError();
  }

  const existing = await repository.findProjectLibrary(
    input.projectId,
    input.libraryId,
  );

  if (existing) {
    throw new ProjectLibraryAlreadyExistsError();
  }

  try {
    return await repository.insertProjectLibrary({
      projectId: input.projectId,
      libraryId: input.libraryId,
      version: input.version ?? null,
    });
  } catch (error) {
    // corrida: outra requisição associou o mesmo par entre a checagem acima e
    // o insert — o unique(project_id, library_id) do banco barra e vira o mesmo 409
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new ProjectLibraryAlreadyExistsError();
    }
    throw error;
  }
}

export type RemoveLibraryInput = {
  userId: string;
  projectId: string;
  libraryId: string;
};

export async function removeLibraryFromProject(
  repository: ProjectLibrariesRepository,
  { userId, projectId, libraryId }: RemoveLibraryInput,
): Promise<void> {
  await assertProjectOwnedByUser(repository, userId, projectId);

  const removed = await repository.deleteProjectLibrary(projectId, libraryId);

  if (!removed) {
    throw new ProjectLibraryNotFoundError();
  }
}

export type UpdateProjectLibraryVersionInput = {
  userId: string;
  projectId: string;
  libraryId: string;
  version: string | null;
};

export async function updateProjectLibraryVersion(
  repository: ProjectLibrariesRepository,
  { userId, projectId, libraryId, version }: UpdateProjectLibraryVersionInput,
): Promise<ProjectLibraryRecord> {
  await assertProjectOwnedByUser(repository, userId, projectId);

  const updated = await repository.updateProjectLibraryVersion(
    projectId,
    libraryId,
    version,
  );

  if (!updated) {
    throw new ProjectLibraryNotFoundError();
  }

  return updated;
}
