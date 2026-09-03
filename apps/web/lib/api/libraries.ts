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

export class CreateLibraryError extends Error {}
export class GetLibraryError extends Error {}
export class UpdateLibraryError extends Error {}

export async function createLibrary(
  input: CreateLibraryInput,
  accessToken: string,
): Promise<Library> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/libraries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
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

export async function getLibrary(
  id: string,
  accessToken: string,
): Promise<Library> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/libraries/${id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new GetLibraryError(
      body.error ?? "Não foi possível buscar a biblioteca",
    );
  }

  return body;
}

export async function updateLibrary(
  id: string,
  input: UpdateLibraryInput,
  accessToken: string,
): Promise<Library> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/libraries/${id}`,
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
    throw new UpdateLibraryError(
      body.error ?? "Não foi possível atualizar a biblioteca",
    );
  }

  return body;
}
