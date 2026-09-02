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

export class CreateProjectError extends Error {}

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
