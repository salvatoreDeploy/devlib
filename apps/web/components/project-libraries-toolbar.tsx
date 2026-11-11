"use client";

import { Tag } from "lucide-react";
import {
  ClearFiltersButton,
  FilterPill,
  SearchPill,
} from "@/components/filter-pills";
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

const VERSION_OPTIONS: { value: VersionFilter; label: string }[] = [
  { value: "with", label: "Com versão" },
  { value: "without", label: "Sem versão" },
];

export function ProjectLibrariesToolbar({
  filters,
  categoryOptions,
  onChange,
  onClear,
}: ProjectLibrariesToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SearchPill
        label="Buscar bibliotecas"
        placeholder="buscar bibliotecas"
        value={filters.q}
        onChange={(q) => onChange({ q })}
      />

      <FilterPill
        label="Categoria"
        icon={Tag}
        allLabel="Todas as categorias"
        options={categoryOptions}
        value={filters.category}
        disabled={categoryOptions.length === 0}
        onChange={(category) => onChange({ category })}
      />

      <FilterPill
        label="Versão"
        allLabel="Todas as versões"
        options={VERSION_OPTIONS}
        value={filters.version}
        formatActive={(option) => option.label}
        onChange={(version) =>
          onChange({ version: version as VersionFilter | null })
        }
      />

      {hasActiveFilters(filters) && <ClearFiltersButton onClick={onClear} />}
    </div>
  );
}
