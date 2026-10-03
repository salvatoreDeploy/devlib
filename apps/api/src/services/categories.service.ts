import type {
  CategoryRecord,
  CategoriesRepository as CategoriesDataRepository,
} from "../repositories/categories.repository";

export type { CategoryRecord };

export type CategoriesRepository = Pick<
  CategoriesDataRepository,
  | "findGlobalCategories"
  | "findCategoriesForProject"
  | "findCategoryByProjectIdAndName"
  | "insertCategory"
>;

export class CategoryNameAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Já existe uma categoria com o nome "${name}" nesse escopo`);
    this.name = "CategoryNameAlreadyExistsError";
  }
}

export async function listCategories(
  repository: CategoriesRepository,
): Promise<CategoryRecord[]> {
  return repository.findGlobalCategories();
}

export async function listCategoriesForProject(
  repository: CategoriesRepository,
  projectId: string,
): Promise<CategoryRecord[]> {
  return repository.findCategoriesForProject(projectId);
}

export type CreateCategoryInput = {
  projectId: string;
  name: string;
};

export async function createCategory(
  repository: CategoriesRepository,
  input: CreateCategoryInput,
): Promise<CategoryRecord> {
  const existing = await repository.findCategoryByProjectIdAndName(
    input.projectId,
    input.name,
  );

  if (existing) {
    throw new CategoryNameAlreadyExistsError(input.name);
  }

  return repository.insertCategory(input);
}
