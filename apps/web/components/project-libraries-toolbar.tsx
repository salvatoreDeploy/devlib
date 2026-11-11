"use client";

import { ChevronDown, Search, Tag, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  hasActiveFilters,
  type CategoryOption,
  type ProjectLibrariesFilters,
  type VersionFilter,
} from "../lib/project-libraries-filters";

// Barra da aba Bibliotecas do projeto (docs/FRONTEND.md): busca em pílula +
// filtros Categoria/Versão em pílulas com dropdown, destacadas quando ativas,
// e "Limpar filtros" quando há algum filtro.

type FilterChanges = Partial<Omit<ProjectLibrariesFilters, "page">>;

type ProjectLibrariesToolbarProps = {
  filters: ProjectLibrariesFilters;
  categoryOptions: CategoryOption[];
  onChange: (changes: FilterChanges) => void;
  onClear: () => void;
};

// Radix RadioGroup não aceita value vazio/null — sentinela pra "todas"
const ALL = "__all__";

const VERSION_LABELS: Record<VersionFilter, string> = {
  with: "Com versão",
  without: "Sem versão",
};

const pillClassName =
  "inline-flex h-[34px] items-center gap-2 rounded-full border px-3.5 text-[13px] outline-none disabled:pointer-events-none disabled:opacity-50";

function pillState(active: boolean) {
  return active
    ? "border-checkbox-border bg-chip-alt text-foreground"
    : "border-input bg-card text-muted-foreground hover:text-foreground";
}

export function ProjectLibrariesToolbar({
  filters,
  categoryOptions,
  onChange,
  onClear,
}: ProjectLibrariesToolbarProps) {
  const selectedCategory = categoryOptions.find(
    (option) => option.value === filters.category,
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="relative flex h-[34px] w-[200px] items-center">
        <Search
          className="pointer-events-none absolute left-3.5 size-3.5 text-text-fainter"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Buscar bibliotecas"
          placeholder="buscar bibliotecas"
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          className={cn(
            "h-full w-full rounded-full border bg-card pr-3.5 pl-[34px] text-[13px] text-foreground outline-none placeholder:text-text-fainter focus-visible:border-checkbox-border",
            filters.q ? "border-checkbox-border" : "border-input",
          )}
        />
      </label>

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={categoryOptions.length === 0}
          className={cn(pillClassName, pillState(Boolean(filters.category)))}
        >
          <Tag className="size-3.5 text-text-faint" aria-hidden="true" />
          {filters.category
            ? `Categoria: ${selectedCategory?.label ?? "Categoria"}`
            : "Categoria"}
          <ChevronDown
            className="size-[13px] text-text-faint"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={filters.category ?? ALL}
            onValueChange={(value) =>
              onChange({ category: value === ALL ? null : value })
            }
          >
            <DropdownMenuRadioItem value={ALL}>
              Todas as categorias
            </DropdownMenuRadioItem>
            {categoryOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(pillClassName, pillState(Boolean(filters.version)))}
        >
          {filters.version ? VERSION_LABELS[filters.version] : "Versão"}
          <ChevronDown
            className="size-[13px] text-text-faint"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={filters.version ?? ALL}
            onValueChange={(value) =>
              onChange({
                version: value === ALL ? null : (value as VersionFilter),
              })
            }
          >
            <DropdownMenuRadioItem value={ALL}>
              Todas as versões
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="with">
              Com versão
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="without">
              Sem versão
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-1.5 text-[13px] text-text-faint hover:text-foreground"
        >
          <X className="size-[13px]" aria-hidden="true" />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
