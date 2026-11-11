// Busca, filtros e paginação da aba Bibliotecas do projeto — tudo no cliente
// (a lista do projeto é limitada e a API devolve inteira). Estado vive na URL:
// ?q=&category=&version=&page=
import type { ProjectLibrary } from "./api/projects";

export const PAGE_SIZE = 10;

// valor do filtro de categoria pra libs sem categoria efetiva
export const NO_CATEGORY = "none";

export type VersionFilter = "with" | "without";

export type ProjectLibrariesFilters = {
  q: string;
  category: string | null;
  version: VersionFilter | null;
  page: number;
};

export const DEFAULT_FILTERS: ProjectLibrariesFilters = {
  q: "",
  category: null,
  version: null,
  page: 1,
};

export type CategoryOption = { value: string; label: string };

export type FilteredPage = {
  items: ProjectLibrary[];
  total: number;
  page: number;
  pageCount: number;
  // intervalo exibido, 1-based (0–0 quando não há resultado)
  start: number;
  end: number;
};

type SearchParamsLike = { get(name: string): string | null };

export function parseFilters(
  params: SearchParamsLike,
): ProjectLibrariesFilters {
  const version = params.get("version");
  const page = Number(params.get("page"));

  return {
    q: params.get("q") ?? "",
    category: params.get("category") || null,
    version: version === "with" || version === "without" ? version : null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function toSearchString(filters: ProjectLibrariesFilters): string {
  const params = new URLSearchParams();

  // q vai como digitado (sem trim): o campo de busca relê da URL, e cortar o
  // espaço final impediria digitar "react query"
  if (filters.q.trim()) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.version) params.set("version", filters.version);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params.toString();
}

export function hasActiveFilters(filters: ProjectLibrariesFilters): boolean {
  return Boolean(filters.q.trim() || filters.category || filters.version);
}

// minúsculas e sem acentos: "Validação" e "VALIDACAO" casam
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export function effectiveCategoryId(library: ProjectLibrary): string | null {
  return library.projectCategoryId ?? library.categoryId;
}

export function categoryOptions(
  libraries: ProjectLibrary[],
  categoryNames: ReadonlyMap<string, string>,
): CategoryOption[] {
  const ids = new Set<string>();
  let hasUncategorized = false;

  for (const library of libraries) {
    const id = effectiveCategoryId(library);
    if (id) {
      ids.add(id);
    } else {
      hasUncategorized = true;
    }
  }

  const options = [...ids]
    .map((id) => ({ value: id, label: categoryNames.get(id) ?? "Categoria" }))
    .sort((a, b) => collator.compare(a.label, b.label));

  return hasUncategorized
    ? [...options, { value: NO_CATEGORY, label: "Sem categoria" }]
    : options;
}

export function applyFilters(
  libraries: ProjectLibrary[],
  filters: ProjectLibrariesFilters,
): FilteredPage {
  const q = normalize(filters.q.trim());

  const filtered = libraries
    .filter((library) => {
      if (q && !normalize(library.name).includes(q)) {
        return false;
      }
      if (filters.category) {
        const id = effectiveCategoryId(library);
        const matches =
          filters.category === NO_CATEGORY
            ? id === null
            : id === filters.category;
        if (!matches) {
          return false;
        }
      }
      if (filters.version === "with" && !library.version) {
        return false;
      }
      if (filters.version === "without" && library.version) {
        return false;
      }
      return true;
    })
    .sort((a, b) => collator.compare(a.name, b.name));

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * PAGE_SIZE;
  const items = filtered.slice(offset, offset + PAGE_SIZE);

  return {
    items,
    total,
    page,
    pageCount,
    start: total === 0 ? 0 : offset + 1,
    end: offset + items.length,
  };
}
