import { authenticatedFetch } from "./http-client";

export type CreateLibraryInput = {
  name: string;
  categoryId?: string;
  notes?: string;
};

export type Library = {
  id: string;
  name: string;
  categoryId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateLibraryInput = {
  name?: string;
  categoryId?: string;
  notes?: string;
};

export type LibraryProject = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  version: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryOverview = Library & {
  projectsCount: number;
};

export type EffectiveCategory = {
  // null = projetos em que a lib não tem categoria efetiva
  id: string | null;
  name: string | null;
  projects: { id: string; name: string }[];
};

export type LibraryCatalogItem = LibraryOverview & {
  effectiveCategories: EffectiveCategory[];
};

export type LibrariesCatalogPage = {
  items: LibraryCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CatalogUsage = "all" | "used" | "unused";

export type LibrariesCatalogParams = {
  q?: string;
  // UUID ou "none"
  categoryId?: string;
  usage?: CatalogUsage;
  tagId?: string;
  page?: number;
};

export type CatalogFacetCategory = {
  id: string;
  name: string;
  projectId: string | null;
  projectName: string | null;
};

export type CatalogFacets = {
  categories: CatalogFacetCategory[];
  hasUncategorized: boolean;
  tags: { id: string; name: string }[];
};

export class CreateLibraryError extends Error {}
export class GetLibraryError extends Error {}
export class UpdateLibraryError extends Error {}
export class GetLibraryProjectsError extends Error {}
export class GetLibrariesCatalogError extends Error {}
export class GetCatalogFacetsError extends Error {}

export async function createLibrary(
  input: CreateLibraryInput,
): Promise<Library> {
  const response = await authenticatedFetch("/libraries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new CreateLibraryError(
      body.error ?? "Não foi possível criar a biblioteca",
    );
  }

  return body;
}

export async function getLibrary(id: string): Promise<Library> {
  const response = await authenticatedFetch(`/libraries/${id}`);

  const body = await response.json();

  if (!response.ok) {
    throw new GetLibraryError(
      body.error ?? "Não foi possível buscar a biblioteca",
    );
  }

  return body;
}

export async function getLibraryProjects(
  id: string,
): Promise<LibraryProject[]> {
  const response = await authenticatedFetch(`/libraries/${id}/projects`);

  const body = await response.json();

  if (!response.ok) {
    throw new GetLibraryProjectsError(
      body.error ?? "Não foi possível buscar os projetos da biblioteca",
    );
  }

  return body;
}

export async function updateLibrary(
  id: string,
  input: UpdateLibraryInput,
): Promise<Library> {
  const response = await authenticatedFetch(`/libraries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new UpdateLibraryError(
      body.error ?? "Não foi possível atualizar a biblioteca",
    );
  }

  return body;
}

export async function getLibrariesCatalog(
  params: LibrariesCatalogParams,
): Promise<LibrariesCatalogPage> {
  const query = new URLSearchParams();
  for (const key of ["q", "categoryId", "usage", "tagId", "page"] as const) {
    const value = params[key];
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const search = query.toString();

  const response = await authenticatedFetch(
    search ? `/libraries/catalog?${search}` : "/libraries/catalog",
  );

  const body = await response.json();

  if (!response.ok) {
    throw new GetLibrariesCatalogError(
      body.error ?? "Não foi possível buscar as bibliotecas",
    );
  }

  return body;
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  const response = await authenticatedFetch("/libraries/catalog/facets");

  const body = await response.json();

  if (!response.ok) {
    throw new GetCatalogFacetsError(
      body.error ?? "Não foi possível buscar as opções de filtro",
    );
  }

  return body;
}

