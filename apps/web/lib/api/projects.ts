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

export class CreateProjectError extends Error {}
export class GetProjectError extends Error {}
export class UpdateProjectError extends Error {}
export class ListProjectsError extends Error {}
export class DeleteProjectError extends Error {}

export async function createProject(
  input: CreateProjectInput,
  accessToken: string,
): Promise<Project> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
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

export async function getProject(
  id: string,
  accessToken: string,
): Promise<Project> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

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
  accessToken: string,
): Promise<Project> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new UpdateProjectError(
      body.error ?? "Não foi possível atualizar o projeto",
    );
  }

  return body;
}

export async function listProjects(accessToken: string): Promise<Project[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new ListProjectsError(
      body.error ?? "Não foi possível listar os projetos",
    );
  }

  return body;
}

export async function deleteProject(
  id: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const body = await response.json();
    throw new DeleteProjectError(
      body.error ?? "Não foi possível excluir o projeto",
    );
  }
}
