import type {
  LibrariesRepository,
  LibraryRecord,
} from "../repositories/libraries.repository";
import type { ProjectLibrariesRepository as ProjectLibrariesDataRepository } from "../repositories/project-libraries.repository";
import type { ProjectRecord } from "../repositories/projects.repository";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../repositories/pg-errors";
import { ProjectNotFoundError } from "./projects.service";

export { ProjectNotFoundError };

// o que a importação lê e grava — tudo isso roda dentro da transação
export type ImportLibrariesRepository = Pick<
  LibrariesRepository,
  "findLibrariesByNames" | "findLibrariesByProjectId" | "insertLibrary"
> &
  Pick<
    ProjectLibrariesDataRepository,
    "insertProjectLibrary" | "updateProjectLibrary"
  >;

export type ProjectLibrariesImportRepository = ImportLibrariesRepository & {
  findProjectById(id: string): Promise<ProjectRecord | undefined>;
  // fn recebe repositórios ligados à transação; erro dentro de fn = rollback
  transaction<T>(
    fn: (repository: ImportLibrariesRepository) => Promise<T>,
  ): Promise<T>;
};

export class ProjectLibrariesImportConflictError extends Error {
  constructor() {
    super(
      "O catálogo ou o projeto mudou durante a importação — nada foi gravado, tente de novo",
    );
    this.name = "ProjectLibrariesImportConflictError";
  }
}

export type ImportAction =
  "create" | "associate" | "updateVersion" | "unchanged";

export type ImportItemInput = {
  name: string;
  version?: string;
};

export type ImportReportItem = {
  name: string;
  // versão informada no item (null quando omitida)
  version: string | null;
  action: ImportAction;
  // null só em "create" no dryRun (a biblioteca ainda não existe)
  libraryId: string | null;
  // versão atual no projeto (null quando não associada ou sem versão)
  previousVersion: string | null;
};

export type ImportReport = {
  dryRun: boolean;
  summary: Record<ImportAction, number>;
  items: ImportReportItem[];
};

export type ImportLibrariesInput = {
  userId: string;
  projectId: string;
  // nomes já únicos (garantido pela validação da rota)
  items: ImportItemInput[];
  dryRun: boolean;
};

async function classify(
  repository: ImportLibrariesRepository,
  projectId: string,
  items: ImportItemInput[],
): Promise<ImportReportItem[]> {
  const [catalog, projectLibraries] = await Promise.all([
    repository.findLibrariesByNames(items.map((item) => item.name)),
    repository.findLibrariesByProjectId(projectId),
  ]);

  const catalogByName = new Map<string, LibraryRecord>(
    catalog.map((library) => [library.name, library]),
  );
  const versionByLibraryId = new Map(
    projectLibraries.map((library) => [library.id, library.version]),
  );

  return items.map(({ name, version }) => {
    const informed = version ?? null;
    const library = catalogByName.get(name);

    if (!library) {
      return {
        name,
        version: informed,
        action: "create",
        libraryId: null,
        previousVersion: null,
      };
    }

    if (!versionByLibraryId.has(library.id)) {
      return {
        name,
        version: informed,
        action: "associate",
        libraryId: library.id,
        previousVersion: null,
      };
    }

    const previousVersion = versionByLibraryId.get(library.id) ?? null;
    // version omitida nunca apaga a versão já gravada
    const action: ImportAction =
      version === undefined || version === previousVersion
        ? "unchanged"
        : "updateVersion";

    return {
      name,
      version: informed,
      action,
      libraryId: library.id,
      previousVersion,
    };
  });
}

async function apply(
  repository: ImportLibrariesRepository,
  projectId: string,
  items: ImportReportItem[],
): Promise<ImportReportItem[]> {
  const applied: ImportReportItem[] = [];

  // sequencial: tudo na mesma conexão da transação
  for (const item of items) {
    let libraryId = item.libraryId;

    if (item.action === "create") {
      // criada sem categoria — categoria não faz parte da importação
      const library = await repository.insertLibrary({ name: item.name });
      libraryId = library.id;
    }

    if (item.action === "create" || item.action === "associate") {
      await repository.insertProjectLibrary({
        projectId,
        libraryId: libraryId as string,
        version: item.version,
        categoryId: null,
      });
    }

    if (item.action === "updateVersion") {
      await repository.updateProjectLibrary(projectId, libraryId as string, {
        version: item.version,
      });
    }

    applied.push({ ...item, libraryId });
  }

  return applied;
}

function toReport(dryRun: boolean, items: ImportReportItem[]): ImportReport {
  const summary: Record<ImportAction, number> = {
    create: 0,
    associate: 0,
    updateVersion: 0,
    unchanged: 0,
  };

  for (const item of items) {
    summary[item.action] += 1;
  }

  return { dryRun, summary, items };
}

export async function importLibrariesToProject(
  repository: ProjectLibrariesImportRepository,
  { userId, projectId, items, dryRun }: ImportLibrariesInput,
): Promise<ImportReport> {
  const project = await repository.findProjectById(projectId);

  if (!project || project.userId !== userId) {
    throw new ProjectNotFoundError();
  }

  if (dryRun) {
    return toReport(true, await classify(repository, projectId, items));
  }

  try {
    // classificação dentro da transação: o que é aplicado é o que foi lido
    // nela, e não uma prévia que pode ter envelhecido
    const applied = await repository.transaction(async (tx) =>
      apply(tx, projectId, await classify(tx, projectId, items)),
    );

    return toReport(false, applied);
  } catch (error) {
    // corrida: outra requisição criou a mesma biblioteca ou associou o mesmo
    // par entre a leitura e o insert — o unique aborta a transação inteira
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new ProjectLibrariesImportConflictError();
    }
    throw error;
  }
}
