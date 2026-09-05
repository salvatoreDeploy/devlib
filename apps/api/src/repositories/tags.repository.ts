import { and, eq } from "drizzle-orm";
import { libraryTags, tags, type createDb } from "@devlib/db";

export type DbClient = ReturnType<typeof createDb>;

export type TagRecord = {
  id: string;
  name: string;
  createdAt: Date;
};

export type LibraryTagRecord = {
  libraryId: string;
  tagId: string;
};

export type TagsRepository = {
  findTagByName(name: string): Promise<TagRecord | undefined>;
  insertTag(name: string): Promise<TagRecord>;
  findLibraryTag(
    libraryId: string,
    tagId: string,
  ): Promise<LibraryTagRecord | undefined>;
  insertLibraryTag(libraryId: string, tagId: string): Promise<void>;
  findTagsByLibraryId(libraryId: string): Promise<TagRecord[]>;
};

export function createTagsRepository(db: DbClient): TagsRepository {
  return {
    async findTagByName(name) {
      const rows = await db
        .select()
        .from(tags)
        .where(eq(tags.name, name))
        .limit(1);

      return rows[0];
    },

    async insertTag(name) {
      const rows = await db.insert(tags).values({ name }).returning();

      return rows[0];
    },

    async findLibraryTag(libraryId, tagId) {
      const rows = await db
        .select()
        .from(libraryTags)
        .where(
          and(
            eq(libraryTags.libraryId, libraryId),
            eq(libraryTags.tagId, tagId),
          ),
        )
        .limit(1);

      return rows[0];
    },

    async insertLibraryTag(libraryId, tagId) {
      await db.insert(libraryTags).values({ libraryId, tagId });
    },

    async findTagsByLibraryId(libraryId) {
      return db
        .select({ id: tags.id, name: tags.name, createdAt: tags.createdAt })
        .from(libraryTags)
        .innerJoin(tags, eq(libraryTags.tagId, tags.id))
        .where(eq(libraryTags.libraryId, libraryId));
    },
  };
}
