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

export class CreateLibraryError extends Error {}

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
