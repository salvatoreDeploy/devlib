import type {
  LibraryRecord,
  LibraryOverviewRecord,
  LibrariesRepository as LibrariesDataRepository,
} from "../repositories/libraries.repository";
import type { CategoryRecord } from "../repositories/categories.repository";
import type { LibraryProjectRecord } from "../repositories/projects.repository";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../repositories/pg-errors";

export type { LibraryRecord, LibraryProjectRecord, LibraryOverviewRecord };

export type LibrariesRepository = LibrariesDataRepository & {
  findCategoryById(id: string): Promise<CategoryRecord | undefined>;
};

export type LibraryProjectsRepository = LibrariesRepository & {
  findProjectsByLibraryId(
    libraryId: string,
    userId: string,
  ): Promise<LibraryProjectRecord[]>;
};

export class LibraryNotFoundError extends Error {
  constructor() {
    super("Biblioteca não encontrada");
    this.name = "LibraryNotFoundError";
  }
}

export class LibraryNameAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Já existe uma biblioteca com o nome "${name}"`);
    this.name = "LibraryNameAlreadyExistsError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Categoria não encontrada");
    this.name = "CategoryNotFoundError";
  }
}

// biblioteca é catálogo global: categoria de projeto aqui vazaria pra outros
// projetos/usuários e travaria a exclusão do projeto dono (FK NO ACTION). Mesmo
// erro de categoria inexistente — não confirma que a de outro usuário existe
async function assertGlobalCategory(
  repository: LibrariesRepository,
  categoryId: string,
): Promise<void> {
  const category = await repository.findCategoryById(categoryId);

  if (!category || category.projectId !== null) {
    throw new CategoryNotFoundError();
  }
}

export type CreateLibraryInput = {
  name: string;
  categoryId?: string;
  notes?: string;
};

export async function createLibrary(
  repository: LibrariesRepository,
  input: CreateLibraryInput,
): Promise<LibraryRecord> {
  const existing = await repository.findLibraryByName(input.name);

  if (existing) {
    throw new LibraryNameAlreadyExistsError(input.name);
  }

  if (input.categoryId) {
    await assertGlobalCategory(repository, input.categoryId);
  }

  try {
    return await repository.insertLibrary(input);
  } catch (error) {
    // corrida: outra biblioteca com o mesmo nome entre a checagem e o insert
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new LibraryNameAlreadyExistsError(input.name);
    }
    throw error;
  }
}

export async function listLibraries(
  repository: LibrariesRepository,
): Promise<LibraryRecord[]> {
  return repository.findLibraries();
}

export async function getLibrary(
  repository: LibrariesRepository,
  id: string,
): Promise<LibraryRecord> {
  const library = await repository.findLibraryById(id);

  if (!library) {
    throw new LibraryNotFoundError();
  }

  return library;
}

export type UpdateLibraryInput = {
  name?: string;
  categoryId?: string;
  notes?: string;
};

export async function updateLibrary(
  repository: LibrariesRepository,
  id: string,
  data: UpdateLibraryInput,
): Promise<LibraryRecord> {
  await getLibrary(repository, id);

  if (data.name) {
    const existing = await repository.findLibraryByName(data.name);

    if (existing && existing.id !== id) {
      throw new LibraryNameAlreadyExistsError(data.name);
    }
  }

  if (data.categoryId) {
    await assertGlobalCategory(repository, data.categoryId);
  }

  let updated: Awaited<ReturnType<LibrariesRepository["updateLibrary"]>>;
  try {
    updated = await repository.updateLibrary(id, data);
  } catch (error) {
    // corrida: outra biblioteca assumiu o nome entre a checagem e o update
    if (data.name && pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new LibraryNameAlreadyExistsError(data.name);
    }
    throw error;
  }

  if (!updated) {
    throw new LibraryNotFoundError();
  }

  return updated;
}

export async function deleteLibrary(
  repository: LibrariesRepository,
  id: string,
): Promise<void> {
  await getLibrary(repository, id);
  await repository.deleteLibrary(id);
}

export type ListLibraryProjectsInput = {
  userId: string;
  libraryId: string;
};

export async function listLibraryProjects(
  repository: LibraryProjectsRepository,
  { userId, libraryId }: ListLibraryProjectsInput,
): Promise<LibraryProjectRecord[]> {
  await getLibrary(repository, libraryId);

  return repository.findProjectsByLibraryId(libraryId, userId);
}
