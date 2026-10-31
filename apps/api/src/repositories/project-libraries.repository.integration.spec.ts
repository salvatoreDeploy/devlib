import { describe, expect, it } from "vitest";
import { libraries, projectLibraries, projects } from "@devlib/db";
import { eq } from "drizzle-orm";
import { createProjectLibrariesRepository } from "./project-libraries.repository";
import {
  getTestDb,
  insertLibrary,
  insertProject,
  insertUser,
  pgErrorCode,
} from "../../test/integration/test-db";

async function projectsAndLibrary() {
  const user = await insertUser("ana@example.com");
  const projectA = await insertProject(user.id, "Projeto A");
  const projectB = await insertProject(user.id, "Projeto B");
  const library = await insertLibrary("react");

  return { projectA, projectB, library };
}

describe("createProjectLibrariesRepository (Postgres real)", () => {
  it("insertProjectLibrary grava a associação e findProjectLibrary a encontra", async () => {
    const { projectA, projectB, library } = await projectsAndLibrary();
    const repository = createProjectLibrariesRepository(getTestDb());

    const inserted = await repository.insertProjectLibrary({
      projectId: projectA.id,
      libraryId: library.id,
      version: "18.3.1",
    });

    expect(inserted).toMatchObject({
      projectId: projectA.id,
      libraryId: library.id,
      version: "18.3.1",
    });
    expect(
      await repository.findProjectLibrary(projectA.id, library.id),
    ).toEqual(inserted);
    expect(
      await repository.findProjectLibrary(projectB.id, library.id),
    ).toBeUndefined();
  });

  it("aceita version null", async () => {
    const { projectA, library } = await projectsAndLibrary();
    const repository = createProjectLibrariesRepository(getTestDb());

    const inserted = await repository.insertProjectLibrary({
      projectId: projectA.id,
      libraryId: library.id,
      version: null,
    });

    expect(inserted.version).toBeNull();
  });

  it("bloqueia a mesma biblioteca duas vezes no mesmo projeto (unique project_id+library_id, 23505)", async () => {
    const { projectA, library } = await projectsAndLibrary();
    const repository = createProjectLibrariesRepository(getTestDb());
    await repository.insertProjectLibrary({
      projectId: projectA.id,
      libraryId: library.id,
      version: "18.3.1",
    });

    const error = await repository
      .insertProjectLibrary({
        projectId: projectA.id,
        libraryId: library.id,
        version: "19.0.0",
      })
      .catch((e: unknown) => e);

    expect(pgErrorCode(error)).toBe("23505");
  });

  it("permite a mesma biblioteca em projetos diferentes", async () => {
    const { projectA, projectB, library } = await projectsAndLibrary();
    const repository = createProjectLibrariesRepository(getTestDb());

    await repository.insertProjectLibrary({
      projectId: projectA.id,
      libraryId: library.id,
      version: null,
    });
    await repository.insertProjectLibrary({
      projectId: projectB.id,
      libraryId: library.id,
      version: null,
    });

    expect(await getTestDb().select().from(projectLibraries)).toHaveLength(2);
  });

  it("deleteProjectLibrary remove só a associação informada e retorna true", async () => {
    const { projectA, projectB, library } = await projectsAndLibrary();
    const repository = createProjectLibrariesRepository(getTestDb());
    await repository.insertProjectLibrary({
      projectId: projectA.id,
      libraryId: library.id,
      version: null,
    });
    const keep = await repository.insertProjectLibrary({
      projectId: projectB.id,
      libraryId: library.id,
      version: null,
    });

    expect(await repository.deleteProjectLibrary(projectA.id, library.id)).toBe(
      true,
    );
    expect(
      await repository.findProjectLibrary(projectA.id, library.id),
    ).toBeUndefined();
    expect(
      await repository.findProjectLibrary(projectB.id, library.id),
    ).toEqual(keep);
  });

  it("deleteProjectLibrary retorna false quando não havia associação", async () => {
    const { projectA, library } = await projectsAndLibrary();
    const repository = createProjectLibrariesRepository(getTestDb());

    expect(await repository.deleteProjectLibrary(projectA.id, library.id)).toBe(
      false,
    );
  });

  it("excluir o projeto ou a biblioteca remove as associações (cascade)", async () => {
    const { projectA, projectB, library } = await projectsAndLibrary();
    const repository = createProjectLibrariesRepository(getTestDb());
    await repository.insertProjectLibrary({
      projectId: projectA.id,
      libraryId: library.id,
      version: null,
    });
    await repository.insertProjectLibrary({
      projectId: projectB.id,
      libraryId: library.id,
      version: null,
    });

    await getTestDb().delete(projects).where(eq(projects.id, projectA.id));
    expect(await getTestDb().select().from(projectLibraries)).toHaveLength(1);

    await getTestDb().delete(libraries).where(eq(libraries.id, library.id));
    expect(await getTestDb().select().from(projectLibraries)).toHaveLength(0);
  });
});
