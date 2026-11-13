"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CircleAlert,
  CircleCheck,
  ClipboardPaste,
  Eye,
  FileCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  importProjectLibraries,
  ImportProjectLibrariesError,
  type ImportAction,
  type ImportItemInput,
  type ImportReport,
} from "../lib/api/projects";
import { parsePackageJson, type DependencySource } from "../lib/package-json";
import {
  buildImportPlan,
  buildPreviewRows,
  IMPORT_MAX_ITEMS,
  isSelectable,
  resolveAction,
  toDryRunItems,
  type PreviewRow,
} from "../lib/package-json-import";

type ImportPackageJsonDrawerProps = {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImportPackageJsonDrawer({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ImportPackageJsonDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* conteúdo desmonta ao fechar: reabrir começa do zero */}
        <ImportFlow
          projectId={projectId}
          projectName={projectName}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

type Source = "file" | "paste";
type SelectedFile = { name: string; size: number; text: string };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ImportProjectLibrariesError
    ? error.message
    : fallback;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// FileReader em vez de Blob.text(): mesmo resultado no navegador e no jsdom
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function formatSize(bytes: number) {
  return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
}

function ImportFlow({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"input" | "preview" | "report">("input");
  const [source, setSource] = useState<Source>("file");
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [pasted, setPasted] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [report, setReport] = useState<ImportReport | null>(null);
  const [unchangedOutsideRequest, setUnchangedOutsideRequest] = useState(0);

  const previewMutation = useMutation({
    mutationFn: (items: ImportItemInput[]) =>
      importProjectLibraries(projectId, { items, dryRun: true }),
  });

  const importMutation = useMutation({
    mutationFn: (items: ImportItemInput[]) =>
      importProjectLibraries(projectId, { items, dryRun: false }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["project-libraries", projectId],
      });
      // contagem por categoria efetiva da aba Categorias
      queryClient.invalidateQueries({
        queryKey: ["project-categories", projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["libraries-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
      // "Usada em" de qualquer biblioteca tocada
      queryClient.invalidateQueries({ queryKey: ["library-projects"] });
      setReport(result);
      setStep("report");
    },
  });

  const text = source === "file" ? (file?.text ?? "") : pasted;

  async function loadFile(chosen: File | undefined) {
    if (!chosen) {
      return;
    }
    setInputError(null);
    previewMutation.reset();
    try {
      const fileText = await readFileText(chosen);
      setFile({ name: chosen.name, size: chosen.size, text: fileText });
    } catch {
      setFile(null);
      setInputError("Não foi possível ler o arquivo. Tente de novo.");
    }
  }

  function handlePreview() {
    setInputError(null);
    previewMutation.reset();

    const parsed = parsePackageJson(text);
    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }
    if (parsed.items.length > IMPORT_MAX_ITEMS) {
      setInputError(
        `O package.json tem ${parsed.items.length} dependências — o limite por importação é ${IMPORT_MAX_ITEMS}.`,
      );
      return;
    }

    previewMutation.mutate(toDryRunItems(parsed.items), {
      onSuccess: (dryRun) => {
        const previewRows = buildPreviewRows(parsed.items, dryRun);
        setRows(previewRows);
        // tudo que dá pra importar vem marcado, inclusive as devDependencies
        setSelected(
          new Set(previewRows.filter(isSelectable).map((row) => row.name)),
        );
        setChoices({});
        importMutation.reset();
        setStep("preview");
      },
    });
  }

  const plan = buildImportPlan(rows, selected, choices);

  function handleImport() {
    setUnchangedOutsideRequest(plan.unchanged);
    importMutation.mutate(plan.items);
  }

  if (step === "report" && report) {
    return (
      <ReportStep
        report={report}
        projectName={projectName}
        unchanged={report.summary.unchanged + unchangedOutsideRequest}
        onClose={onClose}
      />
    );
  }

  if (step === "preview") {
    return (
      <PreviewStep
        projectName={projectName}
        rows={rows}
        selected={selected}
        choices={choices}
        plan={plan}
        onSelectedChange={setSelected}
        onChoose={(name, version) =>
          setChoices((current) => ({ ...current, [name]: version }))
        }
        onBack={() => setStep("input")}
        onImport={handleImport}
        isImporting={importMutation.isPending}
        error={
          importMutation.isError
            ? errorMessage(
                importMutation.error,
                "Não foi possível importar. Tente novamente.",
              )
            : null
        }
      />
    );
  }

  const error =
    inputError ??
    (previewMutation.isError
      ? errorMessage(
          previewMutation.error,
          "Não foi possível gerar a prévia. Tente novamente.",
        )
      : null);

  return (
    <div className="flex h-full flex-col gap-4.5">
      <SheetHeader>
        <SheetTitle>Importar package.json</SheetTitle>
        <SheetDescription>
          Traga para {projectName} as dependências de um package.json — você
          confere cada uma antes de importar.
        </SheetDescription>
      </SheetHeader>

      <Tabs
        value={source}
        onValueChange={(value) => {
          setSource(value as Source);
          setInputError(null);
          previewMutation.reset();
        }}
        className="flex flex-col gap-4.5"
      >
        <TabsList>
          <TabsTrigger value="file">
            <Upload aria-hidden="true" />
            Arquivo
          </TabsTrigger>
          <TabsTrigger value="paste">
            <ClipboardPaste aria-hidden="true" />
            Colar JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="flex flex-col gap-3">
          <label
            htmlFor="import-package-json-file"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              loadFile(event.dataTransfer.files[0]);
            }}
            className="flex h-[168px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border border-checkbox-border bg-surface-input p-5 text-center hover:border-text-fainter"
          >
            <Upload
              className="size-[22px] text-text-faint"
              aria-hidden="true"
            />
            <span className="text-[13px] font-medium text-secondary-foreground">
              Arraste o package.json ou clique para escolher
            </span>
            <span className="text-xs text-text-faint">
              apenas .json — lido no navegador
            </span>
          </label>
          <input
            id="import-package-json-file"
            type="file"
            accept=".json,application/json"
            aria-label="Arquivo package.json"
            className="sr-only"
            onChange={(event) => loadFile(event.target.files?.[0])}
          />
          {file && (
            <div className="flex items-center gap-2.5 rounded-[8px] border border-border px-3 py-2.5">
              <FileCheck
                className="size-[15px] text-primary"
                aria-hidden="true"
              />
              <span className="font-mono text-[12.5px] text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-text-faint">
                {formatSize(file.size)}
              </span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paste">
          <textarea
            aria-label="Conteúdo do package.json"
            value={pasted}
            onChange={(event) => {
              setPasted(event.target.value);
              setInputError(null);
            }}
            spellCheck={false}
            placeholder={
              '{\n  "dependencies": { ... },\n  "devDependencies": { ... }\n}'
            }
            aria-invalid={error ? true : undefined}
            className="h-[260px] w-full resize-none rounded-[8px] border border-input bg-surface-input p-3 font-mono text-[12px] leading-[1.55] text-muted-foreground outline-none placeholder:text-text-ghost aria-invalid:border-destructive"
          />
        </TabsContent>
      </Tabs>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.75 text-xs text-destructive"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        <p className="text-xs leading-normal text-text-faint">
          Lemos dependencies e devDependencies. Na próxima etapa você vê o que
          muda no projeto e escolhe o que importar — nada é gravado antes de
          confirmar.
        </p>
      )}

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!text.trim() || previewMutation.isPending}
          onClick={handlePreview}
        >
          <Eye />
          {previewMutation.isPending ? "carregando..." : "Pré-visualizar"}
        </Button>
      </SheetFooter>
    </div>
  );
}

const BADGES: Record<ImportAction, { label: string; className: string }> = {
  create: { label: "nova", className: "bg-brand-bg text-primary" },
  associate: {
    label: "associar",
    className: "border border-input bg-secondary text-muted-foreground",
  },
  updateVersion: { label: "atualizar", className: "bg-warn-bg text-warn" },
  unchanged: {
    label: "sem mudança",
    className: "border border-border-soft text-text-fainter",
  },
};

const REPORT_BADGES: Record<
  Exclude<ImportAction, "unchanged">,
  { label: string; className: string }
> = {
  create: BADGES.create,
  associate: { ...BADGES.associate, label: "associada" },
  updateVersion: { ...BADGES.updateVersion, label: "atualizada" },
};

function ActionBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-[86px] shrink-0 justify-center rounded-[6px] px-2 py-[3px] text-[10px] font-bold tracking-[0.05em] uppercase",
        className,
      )}
    >
      {label}
    </span>
  );
}

const GROUPS: { title: DependencySource; dev: boolean }[] = [
  { title: "dependencies", dev: false },
  { title: "devDependencies", dev: true },
];

type PreviewStepProps = {
  projectName: string;
  rows: PreviewRow[];
  selected: ReadonlySet<string>;
  choices: Record<string, string>;
  plan: ReturnType<typeof buildImportPlan>;
  onSelectedChange: (selected: ReadonlySet<string>) => void;
  onChoose: (name: string, version: string) => void;
  onBack: () => void;
  onImport: () => void;
  isImporting: boolean;
  error: string | null;
};

function PreviewStep({
  projectName,
  rows,
  selected,
  choices,
  plan,
  onSelectedChange,
  onChoose,
  onBack,
  onImport,
  isImporting,
  error,
}: PreviewStepProps) {
  function toggle(names: string[], checked: boolean) {
    const next = new Set(selected);
    for (const name of names) {
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
    }
    onSelectedChange(next);
  }

  const pending = plan.pendingConflicts.length;
  const total = plan.items.length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <SheetHeader>
        <SheetTitle>Importar package.json</SheetTitle>
        <SheetDescription>
          Confira o que muda em {projectName}. Nada foi gravado ainda.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-[8px] border border-border bg-card px-3 py-2.5 text-xs text-text-faint">
        <span>
          <strong className="text-[13px] text-primary">
            {plan.summary.create}
          </strong>{" "}
          novas
        </span>
        <span>
          <strong className="text-[13px] text-secondary-foreground">
            {plan.summary.associate}
          </strong>{" "}
          associar
        </span>
        <span>
          <strong className="text-[13px] text-warn">
            {plan.summary.updateVersion}
          </strong>{" "}
          atualizar
        </span>
        <span>
          <strong className="text-[13px] text-text-faint">
            {plan.unchanged}
          </strong>{" "}
          sem mudança
        </span>
      </div>

      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
        {GROUPS.map(({ title, dev }) => {
          const groupRows = rows.filter((row) => row.dev === dev);
          if (groupRows.length === 0) {
            return null;
          }
          const selectable = groupRows
            .filter(isSelectable)
            .map((row) => row.name);
          const selectedCount = selectable.filter((name) =>
            selected.has(name),
          ).length;
          const allChecked =
            selectable.length > 0 && selectedCount === selectable.length;

          return (
            <div
              key={title}
              role="group"
              aria-label={title}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2.5 px-3">
                {selectable.length > 0 && (
                  <Checkbox
                    aria-label={`Selecionar todas de ${title}`}
                    checked={
                      allChecked
                        ? true
                        : selectedCount > 0
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() => toggle(selectable, !allChecked)}
                  />
                )}
                <span className="font-mono text-[12.5px] font-medium text-secondary-foreground">
                  {title}
                </span>
                <span className="text-xs text-text-faint">
                  {plural(selectedCount, "selecionada", "selecionadas")}
                </span>
              </div>

              <ul className="overflow-hidden rounded-[8px] border border-border">
                {groupRows.map((row) => (
                  <PreviewRowItem
                    key={row.name}
                    row={row}
                    checked={selected.has(row.name)}
                    choice={choices[row.name]}
                    onCheckedChange={(checked) => toggle([row.name], checked)}
                    onChoose={(version) => onChoose(row.name, version)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-1.75 text-xs text-destructive"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {pending > 0 && (
        <p className="flex items-center gap-1.75 text-xs text-warn">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          Escolha a versão de {plural(
            pending,
            "biblioteca",
            "bibliotecas",
          )}{" "}
          para importar.
        </p>
      )}

      <SheetFooter className="mt-0">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          disabled={total === 0 || pending > 0 || isImporting}
          onClick={onImport}
        >
          <Check />
          {isImporting ? "importando..." : `Importar ${total}`}
        </Button>
      </SheetFooter>
    </div>
  );
}

function PreviewRowItem({
  row,
  checked,
  choice,
  onCheckedChange,
  onChoose,
}: {
  row: PreviewRow;
  checked: boolean;
  choice: string | undefined;
  onCheckedChange: (checked: boolean) => void;
  onChoose: (version: string) => void;
}) {
  const selectable = isSelectable(row);
  const action = resolveAction(row, choice);
  const version = row.conflict ? choice : row.version;
  const conflictOptions = row.conflict
    ? (["dependencies", "devDependencies"] as const).map((source) => ({
        source,
        version: row.conflict?.[source] ?? "",
      }))
    : [];

  let sub: { text: string; className: string } | null = null;
  if (row.conflict && action === null) {
    sub = {
      text: "versões diferentes — escolha uma",
      className: "text-warn",
    };
  } else if (action === "updateVersion") {
    sub = {
      text: row.preview.previousVersion
        ? `era ${row.preview.previousVersion}`
        : "sem versão antes",
      className: "text-text-fainter",
    };
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-2 border-b border-border-row px-3 py-2.5 last:border-b-0",
        !selectable && "opacity-55",
      )}
    >
      <div className="flex items-center gap-2.5">
        {selectable ? (
          <Checkbox
            aria-label={`Importar ${row.name}`}
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
          />
        ) : (
          <span className="size-[15px] shrink-0" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium text-foreground">
            {row.name}
          </span>
          {sub && (
            <span className={cn("font-mono text-[11.5px]", sub.className)}>
              {sub.text}
            </span>
          )}
        </div>
        <span className="w-[66px] shrink-0 truncate text-right font-mono text-xs text-muted-foreground">
          {version || "—"}
        </span>
        {action && <ActionBadge {...BADGES[action]} />}
      </div>

      {row.conflict && (
        <div
          role="radiogroup"
          aria-label={`Versão de ${row.name}`}
          className="flex flex-col gap-1.5 pl-[25px]"
        >
          {conflictOptions.map((option) => (
            <label
              key={option.source}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name={`import-version-${row.name}`}
                value={option.version}
                checked={choice === option.version}
                onChange={() => onChoose(option.version)}
                className="size-[13px] accent-primary"
              />
              <span className="font-mono text-xs text-secondary-foreground">
                {option.version || "sem versão"}
              </span>
              <span className="text-[11.5px] text-text-faint">
                {option.source}
              </span>
            </label>
          ))}
        </div>
      )}
    </li>
  );
}

function ReportStep({
  report,
  projectName,
  unchanged,
  onClose,
}: {
  report: ImportReport;
  projectName: string;
  unchanged: number;
  onClose: () => void;
}) {
  const { create, associate, updateVersion } = report.summary;
  const imported = create + associate + updateVersion;
  const changed = report.items.filter((item) => item.action !== "unchanged");
  const stats = [
    {
      count: create,
      label: create === 1 ? "nova no catálogo" : "novas no catálogo",
      className: "text-primary",
    },
    {
      count: associate,
      label: associate === 1 ? "associada" : "associadas",
      className: "text-foreground",
    },
    {
      count: updateVersion,
      label: updateVersion === 1 ? "versão atualizada" : "versões atualizadas",
      className: "text-warn",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4.5">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <CircleCheck
            className="size-[18px] text-primary"
            aria-hidden="true"
          />
          Importação concluída
        </SheetTitle>
        <SheetDescription>
          {plural(imported, "biblioteca importada", "bibliotecas importadas")}{" "}
          para {projectName}.
        </SheetDescription>
      </SheetHeader>

      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-[9px] border border-border bg-card px-3.5 py-3"
          >
            <span
              className={cn(
                "text-[22px] font-bold tracking-[-0.02em]",
                stat.className,
              )}
            >
              {stat.count}
            </span>
            <span className="text-xs text-text-faint">{stat.label}</span>
          </div>
        ))}
      </div>

      {unchanged > 0 && (
        <p className="text-[12.5px] text-text-faint">
          {unchanged === 1
            ? "1 já estava no projeto com a mesma versão."
            : `${unchanged} já estavam no projeto com a mesma versão.`}
        </p>
      )}

      {changed.length > 0 && (
        <ul className="min-h-0 flex-1 overflow-y-auto rounded-[8px] border border-border">
          {changed.map((item) => {
            const action = item.action as Exclude<ImportAction, "unchanged">;
            return (
              <li
                key={item.name}
                className="flex items-center gap-2.5 border-b border-border-row px-3 py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {item.name}
                  </span>
                  {action === "updateVersion" && (
                    <span className="font-mono text-[11.5px] text-text-fainter">
                      {item.previousVersion
                        ? `era ${item.previousVersion}`
                        : "sem versão antes"}
                    </span>
                  )}
                </div>
                <span className="w-[66px] shrink-0 truncate text-right font-mono text-xs text-muted-foreground">
                  {item.version ?? "—"}
                </span>
                <ActionBadge {...REPORT_BADGES[action]} />
              </li>
            );
          })}
        </ul>
      )}

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </SheetFooter>
    </div>
  );
}
