import { describe, expect, it } from "vitest";
import { categories, projects } from "@devlib/db";
import { eq } from "drizzle-orm";
import { createCategoriesRepository } from "./categories.repository";
import {
  getTestDb,
  insertGlobalCategory,
  insertProject,
  insertUser,
  pgErrorCode,
} from "../../test/integration/test-db";

async function twoProjects() {
  const user = await insertUser("ana@example.com");
  const projectA = await insertProject(user.id, "Projeto A");
  const projectB = await insertProject(user.id, "Projeto B");

  return { projectA, projectB };
}

const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();

describe("createCategoriesRepository (Postgres real)", () => {
  it("findGlobalCategories retorna só as categorias sem projeto", async () => {
    const { projectA } = await twoProjects();
    await insertGlobalCategory("Frontend");
    await insertGlobalCategory("Backend");
    const repository = createCategoriesRepository(getTestDb());
    await repository.insertCategory({ projectId: projectA.id, name: "Infra" });

    expect(names(await repository.findGlobalCategories())).toEqual([
      "Backend",
      "Frontend",
    ]);
  });

  it("findCategoriesForProject retorna globais + as do projeto, nunca as de outro projeto", async () => {
    const { projectA, projectB } = await twoProjects();
    await insertGlobalCategory("Frontend");
    const repository = createCategoriesRepository(getTestDb());
    await repository.insertCategory({
      projectId: projectA.id,
      name: "Infra A",
    });
    await repository.insertCategory({
      projectId: projectB.id,
      name: "Infra B",
    });

    expect(
      names(await repository.findCategoriesForProject(projectA.id)),
    ).toEqual(["Frontend", "Infra A"]);
  });

  it("findCategoryById e findCategoryByProjectIdAndName encontram a categoria gravada", async () => {
    const { projectA, projectB } = await twoProjects();
    const repository = createCategoriesRepository(getTestDb());

    const inserted = await repository.insertCategory({
      projectId: projectA.id,
      name: "Infra",
    });

    expect(inserted).toMatchObject({ projectId: projectA.id, name: "Infra" });
    expect(await repository.findCategoryById(inserted.id)).toEqual(inserted);
    expect(
      await repository.findCategoryByProjectIdAndName(projectA.id, "Infra"),
    ).toEqual(inserted);
    expect(
      await repository.findCategoryByProjectIdAndName(projectB.id, "Infra"),
    ).toBeUndefined();
  });

  it("bloqueia nome repetido no mesmo projeto (unique project_id+name, 23505)", async () => {
    const { projectA } = await twoProjects();
    const repository = createCategoriesRepository(getTestDb());
    await repository.insertCategory({ projectId: projectA.id, name: "Infra" });

    const error = await repository
      .insertCategory({ projectId: projectA.id, name: "Infra" })
      .catch((e: unknown) => e);

    expect(pgErrorCode(error)).toBe("23505");
  });

  it("permite o mesmo nome em projetos diferentes", async () => {
    const { projectA, projectB } = await twoProjects();
    const repository = createCategoriesRepository(getTestDb());

    await repository.insertCategory({ projectId: projectA.id, name: "Infra" });
    await repository.insertCategory({ projectId: projectB.id, name: "Infra" });

    expect(await getTestDb().select().from(categories)).toHaveLength(2);
  });

  it("permite uma categoria do projeto com o mesmo nome de uma global", async () => {
    const { projectA } = await twoProjects();
    await insertGlobalCategory("Frontend");
    const repository = createCategoriesRepository(getTestDb());

    await repository.insertCategory({
      projectId: projectA.id,
      name: "Frontend",
    });

    expect(await getTestDb().select().from(categories)).toHaveLength(2);
  });

  it("bloqueia duas globais com o mesmo nome (índice parcial categories_global_name_unique, 23505)", async () => {
    await insertGlobalCategory("Frontend");

    const error = await insertGlobalCategory("Frontend").catch(
      (e: unknown) => e,
    );

    expect(pgErrorCode(error)).toBe("23505");
  });

  it("deleteCategory remove só a categoria informada", async () => {
    const { projectA } = await twoProjects();
    const repository = createCategoriesRepository(getTestDb());
    const keep = await repository.insertCategory({
      projectId: projectA.id,
      name: "Fica",
    });
    const remove = await repository.insertCategory({
      projectId: projectA.id,
      name: "Sai",
    });

    await repository.deleteCategory(remove.id);

    expect(await repository.findCategoryById(remove.id)).toBeUndefined();
    expect(await repository.findCategoryById(keep.id)).toEqual(keep);
  });

  it("excluir o projeto remove as categorias dele (cascade) e mantém as globais", async () => {
    const { projectA } = await twoProjects();
    await insertGlobalCategory("Frontend");
    const repository = createCategoriesRepository(getTestDb());
    await repository.insertCategory({ projectId: projectA.id, name: "Infra" });

    await getTestDb().delete(projects).where(eq(projects.id, projectA.id));

    expect(names(await getTestDb().select().from(categories))).toEqual([
      "Frontend",
    ]);
  });
});
