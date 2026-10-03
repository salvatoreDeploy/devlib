import type {
  CategoryRecord,
  CategoriesRepository as CategoriesDataRepository,
} from "../repositories/categories.repository";
import type { ProjectRecord } from "../repositories/projects.repository";
import { ProjectNotFoundError } from "./projects.service";

export type { CategoryRecord };
export { ProjectNotFoundError };

export type CategoriesRepository = Pick<
  CategoriesDataRepository,
  | "findGlobalCategories"
  | "findCategoriesForProject"
  | "findCategoryByProjectIdAndName"
  | "insertCategory"
>;

export type ProjectCategoriesRepository = Pick<
  CategoriesDataRepository,
  | "findCategoriesForProject"
  | "findCategoryByProjectIdAndName"
  | "insertCategory"
  | "findCategoryById"
  | "deleteCategory"
> & {
  findProjectById(id: string): Promise<ProjectRecord | undefined>;
};

export class CategoryNameAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Já existe uma categoria com o nome "${name}" nesse escopo`);
    this.name = "CategoryNameAlreadyExistsError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Categoria não encontrada");
    this.name = "CategoryNotFoundError";
  }
}

async function assertProjectOwnedByUser(
  repository: ProjectCategoriesRepository,
  userId: string,
  projectId: string,
): Promise<void> {
  const project = await repository.findProjectById(projectId);

  if (!project || project.userId !== userId) {
    throw new ProjectNotFoundError();
  }
}

export async function listCategories(
  repository: CategoriesRepository,
): Promise<CategoryRecord[]> {
  return repository.findGlobalCategories();
}

export type ListProjectCategoriesInput = {
  userId: string;
  projectId: string;
};

export async function listCategoriesForProject(
  repository: ProjectCategoriesRepository,
  { userId, projectId }: ListProjectCategoriesInput,
): Promise<CategoryRecord[]> {
  await assertProjectOwnedByUser(repository, userId, projectId);

  return repository.findCategoriesForProject(projectId);
}

export type CreateCategoryInput = {
  userId: string;
  projectId: string;
  name: string;
};

export async function createCategory(
  repository: ProjectCategoriesRepository,
  input: CreateCategoryInput,
): Promise<CategoryRecord> {
  await assertProjectOwnedByUser(repository, input.userId, input.projectId);

  const existing = await repository.findCategoryByProjectIdAndName(
    input.projectId,
    input.name,
  );

  if (existing) {
    throw new CategoryNameAlreadyExistsError(input.name);
  }

  return repository.insertCategory({
    projectId: input.projectId,
    name: input.name,
  });
}

export type DeleteCategoryInput = {
  userId: string;
  projectId: string;
  categoryId: string;
};

export async function deleteCategory(
  repository: ProjectCategoriesRepository,
  { userId, projectId, categoryId }: DeleteCategoryInput,
): Promise<void> {
  await assertProjectOwnedByUser(repository, userId, projectId);

  const category = await repository.findCategoryById(categoryId);

  if (!category || category.projectId !== projectId) {
    throw new CategoryNotFoundError();
  }

  await repository.deleteCategory(categoryId);
}
