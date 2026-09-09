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

export class CreateLibraryError extends Error {}
export class GetLibraryError extends Error {}
export class UpdateLibraryError extends Error {}
export class GetLibraryProjectsError extends Error {}
export class GetLibrariesOverviewError extends Error {}

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

export async function getLibrariesOverview(): Promise<LibraryOverview[]> {
  const response = await authenticatedFetch("/libraries/overview");

  const body = await response.json();

  if (!response.ok) {
    throw new GetLibrariesOverviewError(
      body.error ?? "Não foi possível buscar as bibliotecas",
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
