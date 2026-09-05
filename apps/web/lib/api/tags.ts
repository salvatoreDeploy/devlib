export type Tag = {
  id: string;
  name: string;
  createdAt: string;
};

export class ListLibraryTagsError extends Error {}
export class AddTagToLibraryError extends Error {}

export async function listLibraryTags(
  libraryId: string,
  accessToken: string,
): Promise<Tag[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/libraries/${libraryId}/tags`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new ListLibraryTagsError(
      body.error ?? "Não foi possível buscar as tags da biblioteca",
    );
  }

  return body;
}

export async function addTagToLibrary(
  libraryId: string,
  name: string,
  accessToken: string,
): Promise<Tag> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/libraries/${libraryId}/tags`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name }),
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new AddTagToLibraryError(
      body.error ?? "Não foi possível adicionar a tag",
    );
  }

  return body;
}
