import type {
  CategoryRecord,
  CategoriesRepository as CategoriesDataRepository,
} from "../repositories/categories.repository";

export type { CategoryRecord };

export type CategoriesRepository = Pick<
  CategoriesDataRepository,
  "findGlobalCategories"
>;

export async function listCategories(
  repository: CategoriesRepository,
): Promise<CategoryRecord[]> {
  return repository.findGlobalCategories();
}
