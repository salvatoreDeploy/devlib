export type Category = {
  id: string;
  projectId: string | null;
  name: string;
  createdAt: string;
};

export class GetCategoriesError extends Error {}

export async function getCategories(accessToken: string): Promise<Category[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/categories`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const body = await response.json();

  if (!response.ok) {
    throw new GetCategoriesError(
      body.error ?? "Não foi possível buscar as categorias",
    );
  }

  return body;
}
