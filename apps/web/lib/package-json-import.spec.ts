import { describe, expect, it } from "vitest";
import {
  buildImportPlan,
  buildPreviewRows,
  isSelectable,
  resolveAction,
  toDryRunItems,
  type PreviewRow,
} from "./package-json-import";
import type { PackageJsonDependency } from "./package-json";
import type { ImportReport, ImportReportItem } from "./api/projects";

const deps: PackageJsonDependency[] = [
  { name: "next", version: "15.0.3", dev: false, sources: ["dependencies"] },
  { name: "react", version: "^18.3.1", dev: false, sources: ["dependencies"] },
  {
    name: "drizzle-orm",
    dev: false,
    sources: ["dependencies", "devDependencies"],
    conflict: { dependencies: "^0.44.0", devDependencies: "^0.45.2" },
  },
  { name: "zod", version: "^3.25.0", dev: false, sources: ["dependencies"] },
  {
    name: "vitest",
    version: "^3.2.0",
    dev: true,
    sources: ["devDependencies"],
  },
  { name: "eslint", dev: true, sources: ["devDependencies"] },
];

function item(
  name: string,
  action: ImportReportItem["action"],
  extra: Partial<ImportReportItem> = {},
): ImportReportItem {
  return {
    name,
    version: null,
    action,
    libraryId: action === "create" ? null : `library-${name}`,
    previousVersion: null,
    ...extra,
  };
}

const report: ImportReport = {
  dryRun: true,
  summary: { create: 2, associate: 1, updateVersion: 1, unchanged: 2 },
  items: [
    item("next", "create", { version: "15.0.3" }),
    item("react", "updateVersion", {
      version: "^18.3.1",
      previousVersion: "^18.2.0",
    }),
    item("drizzle-orm", "unchanged", { previousVersion: "^0.44.0" }),
    item("zod", "unchanged", {
      version: "^3.25.0",
      previousVersion: "^3.25.0",
    }),
    item("vitest", "associate", { version: "^3.2.0" }),
    item("eslint", "create"),
  ],
};

function rowsByName() {
  const rows = buildPreviewRows(deps, report);
  return Object.fromEntries(rows.map((row) => [row.name, row])) as Record<
    string,
    PreviewRow
  >;
}

describe("toDryRunItems", () => {
  it("manda { name, version? } e omite a versão das linhas em conflito (o usuário ainda vai escolher)", () => {
    expect(toDryRunItems(deps)).toEqual([
      { name: "next", version: "15.0.3" },
      { name: "react", version: "^18.3.1" },
      { name: "drizzle-orm" },
      { name: "zod", version: "^3.25.0" },
      { name: "vitest", version: "^3.2.0" },
      { name: "eslint" },
    ]);
  });
});

describe("buildPreviewRows", () => {
  it("junta cada dependência com a classificação do dryRun, pelo nome, na ordem do parser", () => {
    const rows = buildPreviewRows(deps, report);

    expect(rows.map((row) => [row.name, row.preview.action])).toEqual([
      ["next", "create"],
      ["react", "updateVersion"],
      ["drizzle-orm", "unchanged"],
      ["zod", "unchanged"],
      ["vitest", "associate"],
      ["eslint", "create"],
    ]);
    expect(rows[1]).toMatchObject({
      dev: false,
      version: "^18.3.1",
      preview: { previousVersion: "^18.2.0" },
    });
  });
});

describe("isSelectable", () => {
  it("linha 'sem mudança' não é selecionável", () => {
    expect(isSelectable(rowsByName().zod)).toBe(false);
  });

  it("linha em conflito é selecionável mesmo classificada como 'sem mudança' (a escolha pode mudar a versão)", () => {
    expect(isSelectable(rowsByName()["drizzle-orm"])).toBe(true);
  });

  it("nova, associar e atualizar são selecionáveis", () => {
    const rows = rowsByName();
    expect(
      [rows.next, rows.vitest, rows.react].map((row) => isSelectable(row)),
    ).toEqual([true, true, true]);
  });
});

describe("resolveAction", () => {
  it("sem conflito, devolve a ação do dryRun", () => {
    expect(resolveAction(rowsByName().react)).toBe("updateVersion");
  });

  it("conflito sem escolha devolve null (pendente)", () => {
    expect(resolveAction(rowsByName()["drizzle-orm"])).toBeNull();
  });

  it("conflito já associado: versão escolhida igual à atual é 'sem mudança', diferente é 'atualizar versão'", () => {
    const row = rowsByName()["drizzle-orm"];

    expect(resolveAction(row, "^0.44.0")).toBe("unchanged");
    expect(resolveAction(row, "^0.45.2")).toBe("updateVersion");
  });

  it("conflito em lib nova ou só no catálogo mantém a ação do dryRun depois da escolha", () => {
    const deps2: PackageJsonDependency[] = [
      {
        name: "react",
        dev: false,
        sources: ["dependencies", "devDependencies"],
        conflict: { dependencies: "^18.3.1", devDependencies: "^19.0.0" },
      },
    ];
    const [created] = buildPreviewRows(deps2, {
      ...report,
      items: [item("react", "create")],
    });
    const [associated] = buildPreviewRows(deps2, {
      ...report,
      items: [item("react", "associate")],
    });

    expect(resolveAction(created, "^19.0.0")).toBe("create");
    expect(resolveAction(associated, "^18.3.1")).toBe("associate");
  });
});

describe("conflito com um lado sem versão (escolha \"\")", () => {
  const deps3: PackageJsonDependency[] = [
    {
      name: "react",
      dev: false,
      sources: ["dependencies", "devDependencies"],
      conflict: { devDependencies: "^19.0.0" },
    },
  ];

  it("escolher 'sem versão' numa lib já associada é 'sem mudança' (versão omitida não apaga a gravada)", () => {
    const [row] = buildPreviewRows(deps3, {
      ...report,
      items: [item("react", "unchanged", { previousVersion: "^18.2.0" })],
    });

    expect(resolveAction(row, "")).toBe("unchanged");
  });

  it("escolher 'sem versão' numa associação nova envia o item sem versão", () => {
    const rows = buildPreviewRows(deps3, {
      ...report,
      items: [item("react", "associate")],
    });

    const plan = buildImportPlan(rows, new Set(["react"]), { react: "" });

    expect(plan.items).toEqual([{ name: "react" }]);
    expect(plan.summary.associate).toBe(1);
  });
});

describe("buildImportPlan", () => {
  const allSelectable = new Set([
    "next",
    "react",
    "drizzle-orm",
    "vitest",
    "eslint",
  ]);

  it("monta os items só das linhas marcadas, com a versão do arquivo ou a escolhida no conflito", () => {
    const plan = buildImportPlan(
      buildPreviewRows(deps, report),
      allSelectable,
      { "drizzle-orm": "^0.45.2" },
    );

    expect(plan.items).toEqual([
      { name: "next", version: "15.0.3" },
      { name: "react", version: "^18.3.1" },
      { name: "drizzle-orm", version: "^0.45.2" },
      { name: "vitest", version: "^3.2.0" },
      { name: "eslint" },
    ]);
    expect(plan.summary).toEqual({ create: 2, associate: 1, updateVersion: 2 });
    expect(plan.pendingConflicts).toEqual([]);
  });

  it("conta como 'sem mudança' as linhas não selecionáveis e os conflitos resolvidos para a versão atual (independe da marcação)", () => {
    const rows = buildPreviewRows(deps, report);

    expect(buildImportPlan(rows, allSelectable, {}).unchanged).toBe(1);
    expect(
      buildImportPlan(rows, new Set(), { "drizzle-orm": "^0.44.0" }).unchanged,
    ).toBe(2);
  });

  it("linha desmarcada fica de fora", () => {
    const plan = buildImportPlan(
      buildPreviewRows(deps, report),
      new Set(["next"]),
      {},
    );

    expect(plan.items).toEqual([{ name: "next", version: "15.0.3" }]);
    expect(plan.summary).toEqual({ create: 1, associate: 0, updateVersion: 0 });
  });

  it("conflito marcado sem escolha fica pendente e fora dos items", () => {
    const plan = buildImportPlan(
      buildPreviewRows(deps, report),
      allSelectable,
      {},
    );

    expect(plan.pendingConflicts).toEqual(["drizzle-orm"]);
    expect(plan.items.map((entry) => entry.name)).not.toContain("drizzle-orm");
  });

  it("conflito desmarcado não fica pendente", () => {
    const plan = buildImportPlan(
      buildPreviewRows(deps, report),
      new Set(["next"]),
      {},
    );

    expect(plan.pendingConflicts).toEqual([]);
  });

  it("conflito resolvido para a versão atual não é enviado (não muda nada)", () => {
    const plan = buildImportPlan(
      buildPreviewRows(deps, report),
      new Set(["drizzle-orm"]),
      { "drizzle-orm": "^0.44.0" },
    );

    expect(plan.items).toEqual([]);
    expect(plan.pendingConflicts).toEqual([]);
  });

  it("linha 'sem mudança' nunca é enviada, mesmo se aparecer no conjunto marcado", () => {
    const plan = buildImportPlan(
      buildPreviewRows(deps, report),
      new Set(["zod"]),
      {},
    );

    expect(plan.items).toEqual([]);
  });
});
