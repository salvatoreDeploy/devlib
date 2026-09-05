import type {
  TagRecord,
  TagsRepository as TagsDataRepository,
} from "../repositories/tags.repository";
import type { LibraryRecord } from "../repositories/libraries.repository";
import { LibraryNotFoundError } from "./libraries.service";

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
    tag = await repository.insertTag(name);
  } else {
    const association = await repository.findLibraryTag(libraryId, tag.id);

    if (association) {
      throw new TagAlreadyAssociatedError(name);
    }
  }

  await repository.insertLibraryTag(libraryId, tag.id);

  return tag;
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
