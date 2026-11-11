// Busca, filtros e página da seção "Bibliotecas" da Home — aplicados no
// servidor (GET /libraries/catalog). Estado na URL: ?q=&category=&usage=&tag=&page=
import type { LibrariesCatalogParams } from "./api/libraries";

export type HomeUsageFilter = "used" | "unused";

export type HomeLibrariesFilters = {
  q: string;
  // UUID da categoria ou "none"
  category: string | null;
  usage: HomeUsageFilter | null;
  tag: string | null;
  page: number;
};

export const DEFAULT_HOME_FILTERS: HomeLibrariesFilters = {
  q: "",
  category: null,
  usage: null,
  tag: null,
  page: 1,
};

type SearchParamsLike = { get(name: string): string | null };

export function parseHomeFilters(params: SearchParamsLike): HomeLibrariesFilters {
  const usage = params.get("usage");
  const page = Number(params.get("page"));

  return {
    q: params.get("q") ?? "",
    category: params.get("category") || null,
    usage: usage === "used" || usage === "unused" ? usage : null,
    tag: params.get("tag") || null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function toHomeSearchString(filters: HomeLibrariesFilters): string {
  const params = new URLSearchParams();

  // q como digitado (sem trim), mesmo motivo da aba do projeto
  if (filters.q.trim()) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.usage) params.set("usage", filters.usage);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params.toString();
}

export function hasActiveHomeFilters(filters: HomeLibrariesFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.category || filters.usage || filters.tag,
  );
}

export function toCatalogParams(
  filters: HomeLibrariesFilters,
): LibrariesCatalogParams {
  const q = filters.q.trim();

  return {
    ...(q && { q }),
    ...(filters.category && { categoryId: filters.category }),
    ...(filters.usage && { usage: filters.usage }),
    ...(filters.tag && { tagId: filters.tag }),
    page: filters.page,
  };
}
