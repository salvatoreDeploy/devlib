// Regras puras da prévia de importação de package.json: cruza o que o parser
// leu com a classificação do dryRun (POST /projects/:id/libraries/import) e
// monta o request final a partir do que o usuário marcou/escolheu no drawer.
import type { PackageJsonDependency } from "./package-json";
import type {
  ImportAction,
  ImportItemInput,
  ImportReport,
  ImportReportItem,
} from "./api/projects";

// mesmo limite da rota da API
export const IMPORT_MAX_ITEMS = 500;

export type PreviewRow = PackageJsonDependency & { preview: ImportReportItem };

export type ImportPlan = {
  items: ImportItemInput[];
  summary: Record<Exclude<ImportAction, "unchanged">, number>;
  // linhas não selecionáveis + conflitos resolvidos para a versão atual
  unchanged: number;
  // conflitos marcados ainda sem versão escolhida — bloqueiam a importação
  pendingConflicts: string[];
};

// linha em conflito vai sem versão: o dryRun só precisa dizer se a lib existe
// e qual versão está gravada; a versão final é escolha do usuário
export function toDryRunItems(
  dependencies: PackageJsonDependency[],
): ImportItemInput[] {
  return dependencies.map(({ name, version, conflict }) =>
    version !== undefined && !conflict ? { name, version } : { name },
  );
}

export function buildPreviewRows(
  dependencies: PackageJsonDependency[],
  report: ImportReport,
): PreviewRow[] {
  const byName = new Map(report.items.map((item) => [item.name, item]));

  return dependencies.flatMap((dependency) => {
    const preview = byName.get(dependency.name);
    return preview ? [{ ...dependency, preview }] : [];
  });
}

export function isSelectable(row: PreviewRow): boolean {
  return Boolean(row.conflict) || row.preview.action !== "unchanged";
}

// null = conflito ainda sem escolha; "" = escolheu o lado sem versão
export function resolveAction(
  row: PreviewRow,
  chosenVersion?: string,
): ImportAction | null {
  if (!row.conflict) {
    return row.preview.action;
  }
  if (chosenVersion === undefined) {
    return null;
  }
  const { action, previousVersion } = row.preview;
  if (action === "create" || action === "associate") {
    return action;
  }
  // "" = sem versão: omitida, a API nunca apaga a versão já gravada
  if (chosenVersion === "" || chosenVersion === previousVersion) {
    return "unchanged";
  }
  return "updateVersion";
}

export function buildImportPlan(
  rows: PreviewRow[],
  selected: ReadonlySet<string>,
  choices: Readonly<Record<string, string>>,
): ImportPlan {
  const plan: ImportPlan = {
    items: [],
    summary: { create: 0, associate: 0, updateVersion: 0 },
    unchanged: 0,
    pendingConflicts: [],
  };

  for (const row of rows) {
    const choice = choices[row.name];
    const action = resolveAction(row, choice);

    if (action === "unchanged") {
      plan.unchanged += 1;
      continue;
    }
    if (!selected.has(row.name)) {
      continue;
    }
    if (action === null) {
      plan.pendingConflicts.push(row.name);
      continue;
    }

    const version = row.conflict ? choice : row.version;
    plan.items.push(
      version ? { name: row.name, version } : { name: row.name },
    );
    plan.summary[action] += 1;
  }

  return plan;
}
