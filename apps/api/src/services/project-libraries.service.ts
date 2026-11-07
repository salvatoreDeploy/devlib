import type {
  ProjectLibraryRecord,
  ProjectLibrariesRepository as ProjectLibrariesDataRepository,
} from "../repositories/project-libraries.repository";
import type { ProjectRecord } from "../repositories/projects.repository";
import type { LibraryRecord } from "../repositories/libraries.repository";
import type { CategoryRecord } from "../repositories/categories.repository";
import {
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgErrorCode,
} from "../repositories/pg-errors";
import { ProjectNotFoundError } from "./projects.service";
import { LibraryNotFoundError } from "./libraries.service";
import { CategoryNotFoundError } from "./categories.service";

export type { ProjectLibraryRecord };
export { ProjectNotFoundError, LibraryNotFoundError, CategoryNotFoundError };

export type ProjectLibrariesRepository = ProjectLibrariesDataRepository & {
  findProjectById(id: string): Promise<ProjectRecord | undefined>;
  findLibraryById(id: string): Promise<LibraryRecord | undefined>;
  findCategoryById(id: string): Promise<CategoryRecord | undefined>;
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
  categoryId?: string;
};

// só global ou do próprio projeto — de outro projeto é tratada como
// inexistente, pra não confirmar categoria de outro usuário
async function assertCategoryUsableInProject(
  repository: ProjectLibrariesRepository,
  categoryId: string,
  projectId: string,
) {
  const category = await repository.findCategoryById(categoryId);

  if (
    !category ||
    (category.projectId !== null && category.projectId !== projectId)
  ) {
    throw new CategoryNotFoundError();
  }
}

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

  if (input.categoryId) {
    await assertCategoryUsableInProject(
      repository,
      input.categoryId,
      input.projectId,
    );
  }

  try {
    return await repository.insertProjectLibrary({
      projectId: input.projectId,
      libraryId: input.libraryId,
      version: input.version ?? null,
      categoryId: input.categoryId ?? null,
    });
  } catch (error) {
    // corrida: outra requisição associou o mesmo par entre a checagem acima e
    // o insert — o unique(project_id, library_id) do banco barra e vira o mesmo 409
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new ProjectLibraryAlreadyExistsError();
    }
    // corrida: a categoria foi excluída entre a checagem acima e o insert —
    // sem categoryId o 23503 só pode vir de library_id/project_id, segue como estava
    if (input.categoryId && pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new CategoryNotFoundError();
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

export type UpdateProjectLibraryInput = {
  userId: string;
  projectId: string;
  libraryId: string;
  version?: string | null;
  categoryId?: string | null;
};

export async function updateProjectLibrary(
  repository: ProjectLibrariesRepository,
  { userId, projectId, libraryId, ...changes }: UpdateProjectLibraryInput,
): Promise<ProjectLibraryRecord> {
  await assertProjectOwnedByUser(repository, userId, projectId);

  if (changes.categoryId) {
    await assertCategoryUsableInProject(
      repository,
      changes.categoryId,
      projectId,
    );
  }

  // só as chaves presentes no input vão pro SET — omitida não mexe no campo
  const data = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  );

  let updated: ProjectLibraryRecord | undefined;
  try {
    updated = await repository.updateProjectLibrary(projectId, libraryId, data);
  } catch (error) {
    // corrida: a categoria foi excluída entre a checagem acima e o update
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new CategoryNotFoundError();
    }
    throw error;
  }

  if (!updated) {
    throw new ProjectLibraryNotFoundError();
  }

  return updated;
}
