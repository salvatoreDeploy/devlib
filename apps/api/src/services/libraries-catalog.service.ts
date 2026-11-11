import type { LibraryOverviewRecord } from "../repositories/libraries.repository";
import type {
  CatalogFilters,
  EffectiveCategoryRow,
  LibrariesCatalogDataRepository,
} from "../repositories/libraries-catalog.repository";

export type { CatalogFilters };
export type LibrariesCatalogRepository = LibrariesCatalogDataRepository;

// página fixa (decisão do backlog: sem seletor de itens por página)
export const CATALOG_PAGE_SIZE = 10;

export type EffectiveCategory = {
  // null = projetos em que a lib não tem categoria efetiva
  id: string | null;
  name: string | null;
  projects: { id: string; name: string }[];
};

export type LibraryCatalogRecord = LibraryOverviewRecord & {
  effectiveCategories: EffectiveCategory[];
};

export type LibrariesCatalogPage = {
  items: LibraryCatalogRecord[];
  total: number;
  page: number;
  pageSize: number;
};

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

function groupEffectiveCategories(
  rows: EffectiveCategoryRow[],
): Map<string, EffectiveCategory[]> {
  const byLibrary = new Map<string, Map<string | null, EffectiveCategory>>();

  for (const row of rows) {
    const categoriesOfLibrary =
      byLibrary.get(row.libraryId) ??
      new Map<string | null, EffectiveCategory>();
    byLibrary.set(row.libraryId, categoriesOfLibrary);

    const category = categoriesOfLibrary.get(row.categoryId) ?? {
      id: row.categoryId,
      name: row.categoryName,
      projects: [],
    };
    categoriesOfLibrary.set(row.categoryId, category);
    category.projects.push({ id: row.projectId, name: row.projectName });
  }

  const result = new Map<string, EffectiveCategory[]>();
  for (const [libraryId, categoriesOfLibrary] of byLibrary) {
    const list = [...categoriesOfLibrary.values()];
    for (const category of list) {
      category.projects.sort((a, b) => collator.compare(a.name, b.name));
    }
    // por nome; "sem categoria" (id null) por último
    list.sort((a, b) => {
      if (a.id === null) return 1;
      if (b.id === null) return -1;
      return collator.compare(a.name ?? "", b.name ?? "");
    });
    result.set(libraryId, list);
  }
  return result;
}

export async function listLibrariesCatalog(
  repository: LibrariesCatalogRepository,
  userId: string,
  { filters, page }: { filters: CatalogFilters; page: number },
): Promise<LibrariesCatalogPage> {
  const fetchPage = (pageNumber: number) =>
    repository.findLibrariesCatalog(userId, filters, {
      limit: CATALOG_PAGE_SIZE,
      offset: (pageNumber - 1) * CATALOG_PAGE_SIZE,
    });

  let currentPage = page;
  let { items, total } = await fetchPage(currentPage);

  if (total === 0) {
    return { items: [], total: 0, page: 1, pageSize: CATALOG_PAGE_SIZE };
  }

  // página além da última: devolve a última (mesmo comportamento da aba do projeto)
  const lastPage = Math.ceil(total / CATALOG_PAGE_SIZE);
  if (currentPage > lastPage) {
    currentPage = lastPage;
    ({ items, total } = await fetchPage(currentPage));
  }

  const effective = groupEffectiveCategories(
    await repository.findEffectiveCategories(
      userId,
      items.map((item) => item.id),
    ),
  );

  return {
    items: items.map((item) => ({
      ...item,
      effectiveCategories: effective.get(item.id) ?? [],
    })),
    total,
    page: currentPage,
    pageSize: CATALOG_PAGE_SIZE,
  };
}
