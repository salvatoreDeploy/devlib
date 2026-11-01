import { authenticatedFetch } from "./http-client";

export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
};

export type ProjectLibrary = {
  id: string;
  name: string;
  categoryId: string | null;
  notes: string | null;
  version: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssociateLibraryToProjectInput = {
  libraryId: string;
  version?: string;
};

export type ProjectLibraryAssociation = {
  id: string;
  projectId: string;
  libraryId: string;
  version: string | null;
  createdAt: string;
};

export type ProjectOverview = Project & {
  librariesCount: number;
  libraryNames: string[];
};

export class CreateProjectError extends Error {}
export class GetProjectError extends Error {}
export class UpdateProjectError extends Error {}
export class ListProjectsError extends Error {}
export class DeleteProjectError extends Error {}
export class GetProjectLibrariesError extends Error {}
export class GetProjectsOverviewError extends Error {}
export class AssociateLibraryToProjectError extends Error {}
export class RemoveLibraryFromProjectError extends Error {}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const response = await authenticatedFetch("/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new CreateProjectError(
      body.error ?? "Não foi possível criar o projeto",
    );
  }

  return body;
}

export async function getProject(id: string): Promise<Project> {
  const response = await authenticatedFetch(`/projects/${id}`);

  const body = await response.json();

  if (!response.ok) {
    throw new GetProjectError(
      body.error ?? "Não foi possível buscar o projeto",
    );
  }

  return body;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const response = await authenticatedFetch(`/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new UpdateProjectError(
      body.error ?? "Não foi possível atualizar o projeto",
    );
  }

  return body;
}

export async function listProjects(): Promise<Project[]> {
  const response = await authenticatedFetch("/projects");

  const body = await response.json();

  if (!response.ok) {
    throw new ListProjectsError(
      body.error ?? "Não foi possível listar os projetos",
    );
  }

  return body;
}

export async function getProjectLibraries(
  id: string,
): Promise<ProjectLibrary[]> {
  const response = await authenticatedFetch(`/projects/${id}/libraries`);

  const body = await response.json();

  if (!response.ok) {
    throw new GetProjectLibrariesError(
      body.error ?? "Não foi possível buscar as bibliotecas do projeto",
    );
  }

  return body;
}

export async function getProjectsOverview(): Promise<ProjectOverview[]> {
  const response = await authenticatedFetch("/projects/overview");

  const body = await response.json();

  if (!response.ok) {
    throw new GetProjectsOverviewError(
      body.error ?? "Não foi possível listar os projetos",
    );
  }

  return body;
}

export async function deleteProject(id: string): Promise<void> {
  const response = await authenticatedFetch(`/projects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json();
    throw new DeleteProjectError(
      body.error ?? "Não foi possível excluir o projeto",
    );
  }
}

export async function associateLibraryToProject(
  projectId: string,
  input: AssociateLibraryToProjectInput,
): Promise<ProjectLibraryAssociation> {
  const response = await authenticatedFetch(
    `/projects/${projectId}/libraries`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new AssociateLibraryToProjectError(
      body.error ?? "Não foi possível associar a biblioteca ao projeto",
    );
  }

  return body;
}

export async function removeLibraryFromProject(
  projectId: string,
  libraryId: string,
): Promise<void> {
  const response = await authenticatedFetch(
    `/projects/${projectId}/libraries/${libraryId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const body = await response.json();
    throw new RemoveLibraryFromProjectError(
      body.error ?? "Não foi possível remover a biblioteca do projeto",
    );
  }
}
