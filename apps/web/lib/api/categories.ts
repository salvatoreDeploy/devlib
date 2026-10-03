import { authenticatedFetch } from "./http-client";

export type Category = {
  id: string;
  projectId: string | null;
  name: string;
  createdAt: string;
};

export class GetCategoriesError extends Error {}
export class GetProjectCategoriesError extends Error {}
export class DeleteProjectCategoryError extends Error {}

export async function getCategories(): Promise<Category[]> {
  const response = await authenticatedFetch("/categories");

  const body = await response.json();

  if (!response.ok) {
    throw new GetCategoriesError(
      body.error ?? "Não foi possível buscar as categorias",
    );
  }

  return body;
}

export async function getProjectCategories(
  projectId: string,
): Promise<Category[]> {
  const response = await authenticatedFetch(
    `/projects/${projectId}/categories`,
  );

  const body = await response.json();

  if (!response.ok) {
    throw new GetProjectCategoriesError(
      body.error ?? "Não foi possível buscar as categorias do projeto",
    );
  }

  return body;
}

export async function deleteProjectCategory(
  projectId: string,
  categoryId: string,
): Promise<void> {
  const response = await authenticatedFetch(
    `/projects/${projectId}/categories/${categoryId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const body = await response.json();
    throw new DeleteProjectCategoryError(
      body.error ?? "Não foi possível excluir a categoria",
    );
  }
}
