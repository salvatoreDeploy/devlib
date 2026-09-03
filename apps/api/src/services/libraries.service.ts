import type {
  LibraryRecord,
  LibrariesRepository as LibrariesDataRepository,
} from "../repositories/libraries.repository";
import type { CategoryRecord } from "../repositories/categories.repository";

export type { LibraryRecord };

export type LibrariesRepository = LibrariesDataRepository & {
  findCategoryById(id: string): Promise<CategoryRecord | undefined>;
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
    const category = await repository.findCategoryById(input.categoryId);

    if (!category) {
      throw new CategoryNotFoundError();
    }
  }

  return repository.insertLibrary(input);
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
    const category = await repository.findCategoryById(data.categoryId);

    if (!category) {
      throw new CategoryNotFoundError();
    }
  }

  const updated = await repository.updateLibrary(id, data);

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
