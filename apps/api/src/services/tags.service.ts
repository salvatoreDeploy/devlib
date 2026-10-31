import type {
  TagRecord,
  TagsRepository as TagsDataRepository,
} from "../repositories/tags.repository";
import type { LibraryRecord } from "../repositories/libraries.repository";
import { LibraryNotFoundError } from "./libraries.service";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../repositories/pg-errors";

export type { TagRecord };
export { LibraryNotFoundError };

export type TagsRepository = TagsDataRepository & {
  findLibraryById(id: string): Promise<LibraryRecord | undefined>;
};

export class TagAlreadyAssociatedError extends Error {
  constructor(name: string) {
    super(`A tag "${name}" já está associada a essa biblioteca`);
    this.name = "TagAlreadyAssociatedError";
  }
}

export async function addTagToLibrary(
  repository: TagsRepository,
  libraryId: string,
  name: string,
): Promise<TagRecord> {
  const library = await repository.findLibraryById(libraryId);

  if (!library) {
    throw new LibraryNotFoundError();
  }

  let tag = await repository.findTagByName(name);

  if (!tag) {
    tag = await insertOrReuseTag(repository, name);
  } else {
    const association = await repository.findLibraryTag(libraryId, tag.id);

    if (association) {
      throw new TagAlreadyAssociatedError(name);
    }
  }

  try {
    await repository.insertLibraryTag(libraryId, tag.id);
  } catch (error) {
    // corrida: a mesma tag foi associada a essa biblioteca entre a checagem
    // e o insert — a PK (library_id, tag_id) barra
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new TagAlreadyAssociatedError(name);
    }
    throw error;
  }

  return tag;
}

// tags são globais e criadas sob demanda: se outra requisição criou a mesma
// tag entre a busca e o insert (23505 em tags.name), reaproveita a dela em
// vez de responder 409
async function insertOrReuseTag(
  repository: TagsRepository,
  name: string,
): Promise<TagRecord> {
  try {
    return await repository.insertTag(name);
  } catch (error) {
    if (pgErrorCode(error) !== PG_UNIQUE_VIOLATION) {
      throw error;
    }

    const existing = await repository.findTagByName(name);
    if (!existing) {
      throw error;
    }
    return existing;
  }
}

export async function listLibraryTags(
  repository: TagsRepository,
  libraryId: string,
): Promise<TagRecord[]> {
  const library = await repository.findLibraryById(libraryId);

  if (!library) {
    throw new LibraryNotFoundError();
  }

  return repository.findTagsByLibraryId(libraryId);
}
