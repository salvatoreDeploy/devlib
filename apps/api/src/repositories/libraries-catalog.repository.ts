import { and, count, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import {
  categories,
  libraries,
  libraryTags,
  projectLibraries,
  projects,
  tags,
} from "@devlib/db";
import type { DbClient, LibraryOverviewRecord } from "./libraries.repository";

export type CatalogUsage = "all" | "used" | "unused";

export type CatalogFilters = {
  q?: string;
  // UUID da categoria, ou "none" pra sem categoria
  categoryId?: string;
  usage: CatalogUsage;
  tagId?: string;
};

export type CatalogPageRequest = { limit: number; offset: number };

export type EffectiveCategoryRow = {
  libraryId: string;
  categoryId: string | null;
  categoryName: string | null;
  projectId: string;
  projectName: string;
};

export type LibrariesCatalogDataRepository = {
  findLibrariesCatalog(
    userId: string,
    filters: CatalogFilters,
    pageRequest: CatalogPageRequest,
  ): Promise<{ items: LibraryOverviewRecord[]; total: number }>;
  findEffectiveCategories(
    userId: string,
    libraryIds: string[],
  ): Promise<EffectiveCategoryRow[]>;
  findCatalogFacets(userId: string): Promise<CatalogFacets>;
};

export type CatalogFacetCategory = {
  id: string;
  name: string;
  // categoria de projeto: o projeto (do usuário) a que pertence
  projectId: string | null;
  projectName: string | null;
};

export type CatalogFacets = {
  categories: CatalogFacetCategory[];
  hasUncategorized: boolean;
  tags: { id: string; name: string }[];
};

export const NO_CATEGORY = "none";

// % _ \ do texto do usuário são literais no ILIKE (escape padrão do Postgres: \)
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// associações da biblioteca nos projetos do usuário (subquery correlacionada,
// com alias pra não colidir com o LEFT JOIN da consulta externa)
function userAssociations(userId: string, extra?: SQL): SQL {
  return sql`exists (
    select 1 from ${projectLibraries} as pl2
    inner join ${projects} as p2 on p2.id = pl2.project_id
    where pl2.library_id = ${libraries.id}
      and p2.user_id = ${userId}
      ${extra ? sql`and ${extra}` : sql``}
  )`;
}

// categoria "que a coluna mostra": efetiva (do projeto, senão a global) nas
// associações do usuário; sem uso por ele, a global da biblioteca
function categoryCondition(userId: string, categoryId: string): SQL {
  const effective = sql`coalesce(pl2.category_id, ${libraries.categoryId})`;
  const notUsed = sql`not ${userAssociations(userId)}`;

  if (categoryId === NO_CATEGORY) {
    return sql`(${userAssociations(userId, sql`${effective} is null`)}
      or (${notUsed} and ${libraries.categoryId} is null))`;
  }
  return sql`(${userAssociations(userId, sql`${effective} = ${categoryId}`)}
    or (${notUsed} and ${libraries.categoryId} = ${categoryId}))`;
}

function catalogConditions(
  userId: string,
  filters: CatalogFilters,
): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.q) {
    conditions.push(ilike(libraries.name, `%${escapeLike(filters.q)}%`));
  }
  if (filters.tagId) {
    conditions.push(sql`exists (
      select 1 from ${libraryTags} as lt
      where lt.library_id = ${libraries.id} and lt.tag_id = ${filters.tagId}
    )`);
  }
  if (filters.usage === "used") {
    conditions.push(userAssociations(userId));
  } else if (filters.usage === "unused") {
    conditions.push(sql`not ${userAssociations(userId)}`);
  }
  if (filters.categoryId) {
    conditions.push(categoryCondition(userId, filters.categoryId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function createLibrariesCatalogRepository(
  db: DbClient,
): LibrariesCatalogDataRepository {
  return {
    async findLibrariesCatalog(userId, filters, { limit, offset }) {
      const where = catalogConditions(userId, filters);

      // mesmo padrão do overview: filtro por usuário na condição do LEFT JOIN
      // (em WHERE, libs sem uso do usuário sumiriam) — ver docs/DECISIONS.md
      const items = await db
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
        .where(where)
        .groupBy(libraries.id)
        .orderBy(sql`lower(${libraries.name})`, libraries.id)
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(libraries)
        .where(where);

      return { items, total };
    },

    async findEffectiveCategories(userId, libraryIds) {
      if (libraryIds.length === 0) {
        return [];
      }

      const effectiveCategoryId = sql<
        string | null
      >`coalesce(${projectLibraries.categoryId}, ${libraries.categoryId})`;

      return db
        .select({
          libraryId: projectLibraries.libraryId,
          categoryId: effectiveCategoryId,
          categoryName: categories.name,
          projectId: projects.id,
          projectName: projects.name,
        })
        .from(projectLibraries)
        .innerJoin(
          projects,
          and(
            eq(projects.id, projectLibraries.projectId),
            eq(projects.userId, userId),
          ),
        )
        .innerJoin(libraries, eq(libraries.id, projectLibraries.libraryId))
        .leftJoin(categories, eq(categories.id, effectiveCategoryId))
        .where(inArray(projectLibraries.libraryId, libraryIds));
    },

    // opções dos filtros da Home, pela mesma regra do filtro de categoria:
    // efetiva nas associações do usuário; global pras libs que ele não usa —
    // assim nenhuma opção oferecida dá zero resultados
    async findCatalogFacets(userId) {
      const shownCategoryIds = sql`(
        select coalesce(pl3.category_id, l3.category_id)
        from ${projectLibraries} as pl3
        inner join ${projects} as p3
          on p3.id = pl3.project_id and p3.user_id = ${userId}
        inner join ${libraries} as l3 on l3.id = pl3.library_id
        union
        select ${libraries.categoryId} from ${libraries}
        where not ${userAssociations(userId)}
      )`;

      const categoryRows = await db
        .select({
          id: categories.id,
          name: categories.name,
          projectId: categories.projectId,
          projectName: projects.name,
        })
        .from(categories)
        .leftJoin(projects, eq(projects.id, categories.projectId))
        .where(sql`${categories.id} in ${shownCategoryIds}`);

      const uncategorized = await db.execute<{ value: boolean }>(sql`
        select (
          exists (
            select 1 from ${projectLibraries} as pl3
            inner join ${projects} as p3
              on p3.id = pl3.project_id and p3.user_id = ${userId}
            inner join ${libraries} as l3 on l3.id = pl3.library_id
            where coalesce(pl3.category_id, l3.category_id) is null
          )
          or exists (
            select 1 from ${libraries}
            where ${libraries.categoryId} is null
              and not ${userAssociations(userId)}
          )
        ) as value
      `);

      const tagRows = await db
        .selectDistinct({ id: tags.id, name: tags.name })
        .from(tags)
        .innerJoin(libraryTags, eq(libraryTags.tagId, tags.id));

      return {
        categories: categoryRows,
        hasUncategorized: Boolean(uncategorized.rows[0]?.value),
        tags: tagRows,
      };
    },
  };
}
